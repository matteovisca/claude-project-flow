import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { spawn, type ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';
import type { ScriptInfo, ScriptRun } from '../../shared/types.js';

// process tracking for graceful shutdown — uses global registry
const _g = globalThis as any;
if (!_g.__activeScriptPids) _g.__activeScriptPids = new Set<number>();
const activePids: Set<number> = _g.__activeScriptPids;

const app = new Hono();

// running processes tracked by id
const running = new Map<string, { proc: ChildProcess; run: ScriptRun }>();

// resolve script path in plugin dist
function scriptPath(name: string): string {
	const cacheBase = join(homedir(), '.claude', 'plugins', 'cache');
	// try local development path first
	const devPath = resolve(process.cwd(), 'plugin', 'scripts', 'dist', `${name}.cjs`);
	try { require('fs').accessSync(devPath); return devPath; } catch {}
	// fallback to installed plugin cache
	const glob = require('fs');
	try {
		for (const marketplace of glob.readdirSync(cacheBase, { withFileTypes: true })) {
			if (!marketplace.isDirectory()) continue;
			const p = join(cacheBase, marketplace.name, 'claude-project-flow');
			if (!glob.existsSync(p)) continue;
			for (const ver of glob.readdirSync(p, { withFileTypes: true })) {
				const candidate = join(p, ver.name, 'scripts', 'dist', `${name}.cjs`);
				if (glob.existsSync(candidate)) return candidate;
			}
		}
	} catch {}
	return devPath; // fallback, will error on exec
}

// available scripts metadata
const SCRIPTS: ScriptInfo[] = [
	{
		name: 'context-loader',
		description: 'Load full feature context from DB',
		args: [
			{ name: 'feature', required: false, description: 'Feature name (omit for all projects)' },
			{ name: '--project', required: false, description: 'Project name' },
		],
	},
	{
		name: 'git-ops',
		description: 'Git operations as structured JSON',
		args: [
			{ name: 'command', required: true, description: 'Git operation', options: ['diff', 'log', 'merge-check', 'branch-info'] },
			{ name: 'arg', required: false, description: 'Additional argument (e.g. commit count for log)' },
		],
	},
	{
		name: 'feature-scaffold',
		description: 'Feature init and close (DB-only)',
		args: [
			{ name: 'command', required: true, description: 'Action', options: ['init', 'close'] },
			{ name: '--name', required: true, description: 'Feature name' },
			{ name: '--branch', required: false, description: 'Branch name' },
		],
	},
	{
		name: 'project-git',
		description: 'Run git log/diff/status on a registered project',
		args: [
			{ name: 'project', required: true, description: 'Project name' },
			{ name: 'command', required: true, description: 'Git command', options: ['log', 'diff', 'status'] },
		],
	},
	{
		name: 'man',
		description: 'List all skills, scripts and commands',
		args: [
			{ name: 'topic', required: false, description: 'Skill or script name for details' },
		],
	},
];

// GET /api/scripts/list
app.get('/list', (c) => {
	return c.json(SCRIPTS);
});

// POST /api/scripts/run — execute a script
app.post('/run', async (c) => {
	try {
		const { script, args = [] } = await c.req.json<{ script: string; args: string[] }>();

		// validate script name (whitelist)
		const allowed = SCRIPTS.map(s => s.name);
		if (!allowed.includes(script)) {
			return c.json({ error: `Script "${script}" not allowed. Available: ${allowed.join(', ')}` }, 400);
		}

		const id = randomUUID().slice(0, 8);
		const path = scriptPath(script);

		const run: ScriptRun = {
			id,
			script,
			args,
			status: 'running',
			output: '',
			startedAt: new Date().toISOString(),
		};

		const proc = spawn('node', [path, ...args], {
			cwd: process.cwd(),
			env: { ...process.env },
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		proc.stdout?.on('data', (data: Buffer) => { run.output += data.toString(); });
		proc.stderr?.on('data', (data: Buffer) => { run.output += data.toString(); });

		if (proc.pid) activePids.add(proc.pid);

		proc.on('close', (code) => {
			if (proc.pid) activePids.delete(proc.pid);
			run.status = code === 0 ? 'success' : 'error';
			run.exitCode = code ?? 1;
			run.finishedAt = new Date().toISOString();
			// keep in map for 5 minutes for polling, then cleanup
			setTimeout(() => running.delete(id), 5 * 60 * 1000);
		});

		running.set(id, { proc, run });
		return c.json({ id, status: 'running' });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/scripts/stream/:id — SSE output of running script
app.get('/stream/:id', (c) => {
	const id = c.req.param('id');
	const entry = running.get(id);
	if (!entry) return c.json({ error: 'Script run not found' }, 404);

	return streamSSE(c, async (stream) => {
		let lastLen = 0;
		try {
			while (entry.run.status === 'running') {
				if (entry.run.output.length > lastLen) {
					const chunk = entry.run.output.slice(lastLen);
					lastLen = entry.run.output.length;
					await stream.writeSSE({ event: 'output', data: chunk });
				}
				await stream.sleep(200);
			}
			// send final chunk
			if (entry.run.output.length > lastLen) {
				await stream.writeSSE({ event: 'output', data: entry.run.output.slice(lastLen) });
			}
			await stream.writeSSE({
				event: 'done',
				data: JSON.stringify({ exitCode: entry.run.exitCode, status: entry.run.status }),
			});
		} catch { /* client disconnected */ }
	});
});

// GET /api/scripts/:id — poll status
app.get('/:id', (c) => {
	const id = c.req.param('id');
	const entry = running.get(id);
	if (!entry) return c.json({ error: 'Script run not found' }, 404);
	return c.json(entry.run);
});

// DELETE /api/scripts/:id — kill running script
app.delete('/:id', (c) => {
	const id = c.req.param('id');
	const entry = running.get(id);
	if (!entry) return c.json({ error: 'Script run not found' }, 404);

	if (entry.run.status === 'running') {
		entry.proc.kill('SIGTERM');
		entry.run.status = 'error';
		entry.run.exitCode = -1;
		entry.run.finishedAt = new Date().toISOString();
		entry.run.output += '\n[Terminated by user]';
	}
	return c.json({ ok: true, status: entry.run.status });
});

export default app;
