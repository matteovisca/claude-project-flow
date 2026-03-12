import { Hono } from 'hono';
import { createHash } from 'crypto';
import { getDb } from '../../../db/database.js';

const app = new Hono();

// GET /api/knowledge?project=<name>&category=<cat>
app.get('/', (c) => {
	const db = getDb();
	const project = c.req.query('project');
	const category = c.req.query('category');

	let query = 'SELECT id, project, category, title, source, updated_at, LENGTH(content) as size FROM knowledge_docs WHERE 1=1';
	const params: any[] = [];
	if (project) { query += ' AND project = ?'; params.push(project); }
	if (category) { query += ' AND category = ?'; params.push(category); }
	query += ' ORDER BY updated_at DESC';

	return c.json(db.prepare(query).all(...params));
});

// GET /api/knowledge/search?q=<query>&project=<name>&category=<cat>&limit=<n>
app.get('/search', (c) => {
	const db = getDb();
	const q = c.req.query('q');
	if (!q) return c.json({ error: 'q parameter required' }, 400);

	let query = `
		SELECT d.id, d.project, d.category, d.title, d.source,
			snippet(knowledge_fts, 1, '>>>', '<<<', '...', 40) as excerpt,
			rank
		FROM knowledge_fts f
		JOIN knowledge_docs d ON f.rowid = d.id
		WHERE knowledge_fts MATCH ?
	`;
	const params: any[] = [q];
	const project = c.req.query('project');
	const category = c.req.query('category');
	if (project) { query += ' AND d.project = ?'; params.push(project); }
	if (category) { query += ' AND d.category = ?'; params.push(category); }
	query += ' ORDER BY rank LIMIT ?';
	params.push(parseInt(c.req.query('limit') || '10'));

	return c.json(db.prepare(query).all(...params));
});

// GET /api/knowledge/:id
app.get('/:id', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id);
	if (!doc) return c.json({ error: 'Not found' }, 404);
	return c.json(doc);
});

// POST /api/knowledge
app.post('/', async (c) => {
	const db = getDb();
	const body = await c.req.json<{ title: string; content: string; category: string; project?: string }>();
	if (!body.title || !body.content || !body.category) {
		return c.json({ error: 'title, content, and category are required' }, 400);
	}

	const hash = createHash('md5').update(body.content).digest('hex');
	const result = db.prepare(
		'INSERT INTO knowledge_docs (project, category, title, content, content_hash, source) VALUES (?, ?, ?, ?, ?, ?)'
	).run(body.project ?? null, body.category, body.title, body.content, hash, 'manual');

	const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(result.lastInsertRowid);
	return c.json(doc, 201);
});

// PUT /api/knowledge/:id
app.put('/:id', async (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const body = await c.req.json<{ title?: string; content?: string; category?: string; project?: string }>();

	const existing = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id) as any;
	if (!existing) return c.json({ error: 'Not found' }, 404);

	const updates: string[] = [];
	const params: any[] = [];
	if (body.title !== undefined) { updates.push('title = ?'); params.push(body.title); }
	if (body.category !== undefined) { updates.push('category = ?'); params.push(body.category); }
	if (body.project !== undefined) { updates.push('project = ?'); params.push(body.project); }
	if (body.content !== undefined) {
		const hash = createHash('md5').update(body.content).digest('hex');
		updates.push('content = ?', 'content_hash = ?');
		params.push(body.content, hash);
	}

	if (updates.length === 0) return c.json({ error: 'No updates provided' }, 400);
	updates.push("updated_at = datetime('now')");
	params.push(id);

	db.prepare(`UPDATE knowledge_docs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
	const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id);
	return c.json(doc);
});

// DELETE /api/knowledge/:id
app.delete('/:id', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const result = db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(id);
	if (result.changes === 0) return c.json({ error: 'Not found' }, 404);
	return c.json({ ok: true });
});

export default app;
