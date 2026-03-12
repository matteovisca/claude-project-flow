import { Hono } from 'hono';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import type { FileNode } from '../../shared/types.js';

const app = new Hono();

// binary extensions to flag in tree
const BINARY_EXT = new Set([
	'.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp',
	'.pdf', '.zip', '.gz', '.tar', '.7z',
	'.woff', '.woff2', '.ttf', '.eot',
	'.exe', '.dll', '.so', '.dylib',
	'.sqlite', '.db', '.sqlite3',
]);

function isBinary(filePath: string): boolean {
	return BINARY_EXT.has(extname(filePath).toLowerCase());
}

function buildTree(dirPath: string, depth = 0, maxDepth = 5): FileNode {
	const name = dirPath.split('/').pop() || dirPath;
	const node: FileNode = { name, path: dirPath, type: 'directory', children: [] };

	if (depth >= maxDepth) return node;

	try {
		const entries = readdirSync(dirPath, { withFileTypes: true })
			.filter(e => !e.name.startsWith('.'))
			.sort((a, b) => {
				if (a.isDirectory() && !b.isDirectory()) return -1;
				if (!a.isDirectory() && b.isDirectory()) return 1;
				return a.name.localeCompare(b.name);
			});

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);
			if (entry.isDirectory()) {
				node.children!.push(buildTree(fullPath, depth + 1, maxDepth));
			} else {
				node.children!.push({
					name: entry.name,
					path: fullPath,
					type: 'file',
					binary: isBinary(fullPath),
				});
			}
		}
	} catch { /* permission denied or similar */ }

	return node;
}

// GET /api/files/dirs?path=<root> — list only directories (for folder picker)
app.get('/dirs', (c) => {
	const rootPath = c.req.query('path') || '/';
	const resolved = resolve(rootPath);
	if (!existsSync(resolved)) return c.json({ error: 'path not found' }, 404);

	try {
		const entries = readdirSync(resolved, { withFileTypes: true })
			.filter(e => e.isDirectory() && !e.name.startsWith('.'))
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(e => ({
				name: e.name,
				path: join(resolved, e.name),
			}));
		return c.json({ path: resolved, dirs: entries });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// GET /api/files/tree?path=<root>
app.get('/tree', (c) => {
	const rootPath = c.req.query('path');
	if (!rootPath) return c.json({ error: 'path parameter required' }, 400);
	if (!existsSync(rootPath)) return c.json({ error: 'path not found' }, 404);

	const tree = buildTree(rootPath);
	return c.json(tree);
});

// GET /api/files/read?path=<file>
app.get('/read', (c) => {
	const filePath = c.req.query('path');
	if (!filePath) return c.json({ error: 'path parameter required' }, 400);

	const resolved = resolve(filePath);
	if (!existsSync(resolved)) return c.json({ error: 'file not found' }, 404);

	try {
		const stat = statSync(resolved);
		if (stat.isDirectory()) return c.json({ error: 'path is a directory' }, 400);
		if (isBinary(resolved)) return c.json({ error: 'binary file', binary: true }, 400);

		const content = readFileSync(resolved, 'utf-8');
		return c.json({ path: resolved, content, size: stat.size, modified: stat.mtimeMs });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// PUT /api/files/write
app.put('/write', async (c) => {
	try {
		const { path: filePath, content } = await c.req.json<{ path: string; content: string }>();
		if (!filePath || content === undefined) {
			return c.json({ error: 'path and content required' }, 400);
		}

		const resolved = resolve(filePath);
		if (!existsSync(resolved)) return c.json({ error: 'file not found' }, 404);

		writeFileSync(resolved, content, 'utf-8');
		const stat = statSync(resolved);
		return c.json({ ok: true, path: resolved, size: stat.size, modified: stat.mtimeMs });
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

export default app;
