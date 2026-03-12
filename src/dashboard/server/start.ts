import { serve } from '@hono/node-server';
import { createServer } from 'http';
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import app from './index.js';

const PORT = 3700;
const HOST = '127.0.0.1';
const PID_FILE = join(homedir(), '.claude', 'react-dashboard.pid');
const LOG_DIR = join(homedir(), '.claude', 'logs');
const SHUTDOWN_TIMEOUT = 10_000; // EC-5: 10s grace period

// global registry for active script PIDs (shared with routes/scripts.ts)
const _g = globalThis as any;
if (!_g.__activeScriptPids) _g.__activeScriptPids = new Set<number>();
const activeProcesses: Set<number> = _g.__activeScriptPids;

// check if another instance is running
function isPortInUse(): Promise<boolean> {
	return new Promise((resolve) => {
		const server = createServer();
		server.once('error', (err: NodeJS.ErrnoException) => {
			if (err.code === 'EADDRINUSE') resolve(true);
			else resolve(false);
		});
		server.once('listening', () => {
			server.close(() => resolve(false));
		});
		server.listen(PORT, HOST);
	});
}

async function main() {
	// EC-1: check port
	if (await isPortInUse()) {
		let existingPid = '';
		if (existsSync(PID_FILE)) {
			existingPid = readFileSync(PID_FILE, 'utf-8').trim();
		}
		console.error(`Port ${PORT} already in use${existingPid ? ` (PID: ${existingPid})` : ''}. Dashboard may already be running.`);
		process.exit(1);
	}

	// write PID file and ensure log dir
	mkdirSync(LOG_DIR, { recursive: true });
	writeFileSync(PID_FILE, String(process.pid));

	// EC-5: graceful shutdown — wait for running scripts before exit
	let shuttingDown = false;
	const cleanup = async () => {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log('\nShutting down dashboard server...');

		// wait for active child processes with timeout
		if (activeProcesses.size > 0) {
			console.log(`Waiting for ${activeProcesses.size} running process(es)...`);
			const deadline = Date.now() + SHUTDOWN_TIMEOUT;
			while (activeProcesses.size > 0 && Date.now() < deadline) {
				await new Promise(r => setTimeout(r, 500));
			}
			if (activeProcesses.size > 0) {
				console.log(`Timeout: forcing shutdown with ${activeProcesses.size} process(es) still running.`);
			}
		}

		try { unlinkSync(PID_FILE); } catch {}
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	// start server
	serve({ fetch: app.fetch, port: PORT, hostname: HOST }, (info) => {
		console.log(`Dashboard server running at http://${HOST}:${info.port}`);
	});
}

main().catch((err) => {
	console.error('Failed to start dashboard:', err);
	process.exit(1);
});
