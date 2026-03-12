import { Hono } from 'hono';
import { getDb } from '../../../db/database.js';

const app = new Hono();

// GET /api/projects
app.get('/', (c) => {
	const db = getDb();
	const rows = db.prepare('SELECT * FROM projects ORDER BY name').all();
	return c.json(rows);
});

// GET /api/projects/:id
app.get('/:id', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
	if (!row) return c.json({ error: 'Project not found' }, 404);
	return c.json(row);
});

// POST /api/projects
app.post('/', async (c) => {
	try {
		const body = await c.req.json<{ name: string; path: string; type?: string; definition?: string; overview?: string }>();
		if (!body.name || !body.path) {
			return c.json({ error: 'name and path are required' }, 400);
		}

		const db = getDb();
		const existing = db.prepare('SELECT id FROM projects WHERE name = ?').get(body.name);
		if (existing) {
			return c.json({ error: `Project "${body.name}" already exists` }, 409);
		}

		const result = db.prepare(
			'INSERT INTO projects (name, path, type, definition, overview) VALUES (?, ?, ?, ?, ?)'
		).run(body.name, body.path, body.type || 'app', body.definition ?? null, body.overview ?? null);

		const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
		return c.json(project, 201);
	} catch (err: any) {
		return c.json({ error: err.message }, 500);
	}
});

// PUT /api/projects/:id
app.put('/:id', async (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const body = await c.req.json();

	const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
	if (!existing) return c.json({ error: 'Project not found' }, 404);

	const updates: string[] = [];
	const params: any[] = [];
	for (const f of ['name', 'path', 'type', 'definition', 'overview']) {
		if (f in body) { updates.push(`${f} = ?`); params.push(body[f]); }
	}

	if (updates.length === 0) return c.json({ error: 'No updates provided' }, 400);
	params.push(id);
	db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

	const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
	return c.json(updated);
});

// DELETE /api/projects/:id
app.delete('/:id', (c) => {
	const id = parseInt(c.req.param('id'));
	const db = getDb();
	const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
	if (!row) return c.json({ error: 'Project not found' }, 404);

	db.prepare('DELETE FROM projects WHERE id = ?').run(id);
	return c.json({ ok: true, name: row.name });
});

export default app;
