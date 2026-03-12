import { Hono } from 'hono';
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync, mkdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { getSettings, saveSettings } from '../../../db/database.js';

const app = new Hono();

const CLAUDE_DIR = join(homedir(), '.claude');
const DATA_DIR = join(homedir(), '.claude-project-flow');
const DB_FILE = join(DATA_DIR, 'project-flow.db');
const BACKUP_DIR = join(DATA_DIR, 'backups');

// GET /api/settings/plugin
app.get('/plugin', (c) => {
	const settings = getSettings();
	// add DB info
	let dbSize = 0;
	try { dbSize = statSync(DB_FILE).size; } catch { /* */ }
	return c.json({ ...settings, db_path: DB_FILE, db_size: dbSize });
});

// PUT /api/settings/plugin
app.put('/plugin', async (c) => {
	try {
		const body = await c.req.json();
		const current = getSettings();
		if (typeof body.memory_path === 'string') current.memory_path = body.memory_path;
		saveSettings(current);
		return c.json({ ok: true, settings: current });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// POST /api/settings/db/backup
app.post('/db/backup', (c) => {
	try {
		mkdirSync(BACKUP_DIR, { recursive: true });
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		const backupFile = join(BACKUP_DIR, `project-flow.${ts}.db`);
		copyFileSync(DB_FILE, backupFile);
		const size = statSync(backupFile).size;
		return c.json({ ok: true, file: backupFile, size });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/settings/db/backups — list available backups
app.get('/db/backups', (c) => {
	try {
		if (!existsSync(BACKUP_DIR)) return c.json([]);
		const files = readdirSync(BACKUP_DIR)
			.filter(f => f.startsWith('project-flow.') && f.endsWith('.db'))
			.map(f => {
				const full = join(BACKUP_DIR, f);
				const stat = statSync(full);
				return { name: f, path: full, size: stat.size, created: stat.mtime.toISOString() };
			})
			.sort((a, b) => b.created.localeCompare(a.created));
		return c.json(files);
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// POST /api/settings/db/restore — restore from a backup
app.post('/db/restore', async (c) => {
	try {
		const { file } = await c.req.json<{ file: string }>();
		if (!file || !existsSync(file)) return c.json({ error: 'Backup file not found' }, 404);
		// safety: backup current before restoring
		mkdirSync(BACKUP_DIR, { recursive: true });
		const ts = new Date().toISOString().replace(/[:.]/g, '-');
		copyFileSync(DB_FILE, join(BACKUP_DIR, `project-flow.pre-restore.${ts}.db`));
		// restore
		copyFileSync(file, DB_FILE);
		return c.json({ ok: true, restored: file, note: 'Restart the server to load the restored database' });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/settings/db/download — download current DB
app.get('/db/download', (c) => {
	if (!existsSync(DB_FILE)) return c.json({ error: 'Database not found' }, 404);
	const data = readFileSync(DB_FILE);
	c.header('Content-Type', 'application/x-sqlite3');
	c.header('Content-Disposition', `attachment; filename="project-flow.db"`);
	return c.body(data);
});

// GET /api/settings/db/backups/:name/download — download a specific backup
app.get('/db/backups/:name/download', (c) => {
	const name = c.req.param('name');
	const file = join(BACKUP_DIR, name);
	if (!existsSync(file)) return c.json({ error: 'Not found' }, 404);
	const data = readFileSync(file);
	c.header('Content-Type', 'application/x-sqlite3');
	c.header('Content-Disposition', `attachment; filename="${name}"`);
	return c.body(data);
});

// DELETE /api/settings/db/backups/:name
app.delete('/db/backups/:name', (c) => {
	const name = c.req.param('name');
	const file = join(BACKUP_DIR, name);
	if (!existsSync(file)) return c.json({ error: 'Not found' }, 404);
	try {
		const { unlinkSync } = require('fs');
		unlinkSync(file);
		return c.json({ ok: true });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/settings/claude — ~/.claude/settings.json
app.get('/claude', (c) => {
	const settingsPath = join(CLAUDE_DIR, 'settings.json');
	if (!existsSync(settingsPath)) return c.json({ error: 'settings.json not found' }, 404);

	try {
		const content = readFileSync(settingsPath, 'utf-8');
		return c.json({ path: settingsPath, content, parsed: JSON.parse(content) });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// PUT /api/settings/claude — write ~/.claude/settings.json with backup
app.put('/claude', async (c) => {
	const settingsPath = join(CLAUDE_DIR, 'settings.json');
	try {
		const { content } = await c.req.json<{ content: string }>();
		JSON.parse(content);

		if (existsSync(settingsPath)) {
			const backupDir = join(CLAUDE_DIR, 'backups');
			mkdirSync(backupDir, { recursive: true });
			const ts = new Date().toISOString().replace(/[:.]/g, '-');
			copyFileSync(settingsPath, join(backupDir, `settings.${ts}.json.bak`));
		}

		writeFileSync(settingsPath, content, 'utf-8');
		return c.json({ ok: true, path: settingsPath });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/settings/claude-md — ~/.claude/CLAUDE.md
app.get('/claude-md', (c) => {
	const mdPath = join(CLAUDE_DIR, 'CLAUDE.md');
	if (!existsSync(mdPath)) return c.json({ error: 'CLAUDE.md not found' }, 404);

	const content = readFileSync(mdPath, 'utf-8');
	return c.json({ path: mdPath, content });
});

// PUT /api/settings/claude-md
app.put('/claude-md', async (c) => {
	const mdPath = join(CLAUDE_DIR, 'CLAUDE.md');
	try {
		const { content } = await c.req.json<{ content: string }>();

		if (existsSync(mdPath)) {
			const backupDir = join(CLAUDE_DIR, 'backups');
			mkdirSync(backupDir, { recursive: true });
			const ts = new Date().toISOString().replace(/[:.]/g, '-');
			copyFileSync(mdPath, join(backupDir, `CLAUDE.${ts}.md.bak`));
		}

		writeFileSync(mdPath, content, 'utf-8');
		return c.json({ ok: true, path: mdPath });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/plugins — list installed plugins
app.get('/plugins', (c) => {
	const pluginsDir = join(CLAUDE_DIR, 'plugins');
	if (!existsSync(pluginsDir)) return c.json([]);

	const plugins: { marketplace: string; name: string; versions: string[] }[] = [];

	try {
		const cacheDir = join(pluginsDir, 'cache');
		if (existsSync(cacheDir)) {
			for (const marketplace of readdirSync(cacheDir, { withFileTypes: true })) {
				if (!marketplace.isDirectory()) continue;
				const mDir = join(cacheDir, marketplace.name);
				for (const plugin of readdirSync(mDir, { withFileTypes: true })) {
					if (!plugin.isDirectory()) continue;
					const pDir = join(mDir, plugin.name);
					const versions = readdirSync(pDir, { withFileTypes: true })
						.filter(v => v.isDirectory())
						.map(v => v.name);
					plugins.push({ marketplace: marketplace.name, name: plugin.name, versions });
				}
			}
		}
	} catch { /* skip */ }

	return c.json(plugins);
});

export default app;
