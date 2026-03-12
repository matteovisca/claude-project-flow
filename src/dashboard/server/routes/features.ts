import { Hono } from 'hono';
import { getDb } from '../../../db/database.js';

const app = new Hono();

// GET /api/features?project=<name>&status=<status>
app.get('/', (c) => {
	const db = getDb();
	const project = c.req.query('project');
	const status = c.req.query('status');

	let query = `
		SELECT f.id, f.name, f.branch, f.status, f.version, f.description,
			f.author, f.last_modified_by, f.created_at, f.closed_at,
			p.name as project_name, p.id as project_id
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE 1=1
	`;
	const params: any[] = [];
	if (project) { query += ' AND p.name = ?'; params.push(project); }
	if (status) { query += ' AND f.status = ?'; params.push(status); }
	query += ' ORDER BY f.created_at DESC';

	const rows = db.prepare(query).all(...params);
	return c.json(rows);
});

// GET /api/features/:id — full detail
app.get('/:id', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));

	const row = db.prepare(`
		SELECT f.*, p.name as project_name
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE f.id = ?
	`).get(id) as any;

	if (!row) return c.json({ error: 'Feature not found' }, 404);

	// count documents and attachments
	const docCount = (db.prepare('SELECT COUNT(*) as c FROM feature_documents WHERE feature_id = ?').get(id) as any).c;
	const attCount = (db.prepare('SELECT COUNT(*) as c FROM feature_attachments WHERE feature_id = ?').get(id) as any).c;
	row.document_count = docCount;
	row.attachment_count = attCount;

	return c.json(row);
});

// PUT /api/features/:id — update feature fields
app.put('/:id', async (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const body = await c.req.json();

	const existing = db.prepare('SELECT * FROM features WHERE id = ?').get(id) as any;
	if (!existing) return c.json({ error: 'Feature not found' }, 404);

	const updates: string[] = [];
	const params: any[] = [];
	const fields = ['definition', 'description', 'status', 'branch', 'session_log',
		'requirements_status', 'plans_status', 'pending_discoveries', 'last_modified_by'];

	for (const f of fields) {
		if (f in body) { updates.push(`${f} = ?`); params.push(body[f]); }
	}
	if (body.status === 'closed' || body.status === 'cancelled') {
		updates.push("closed_at = datetime('now')");
	}

	if (updates.length === 0) return c.json({ error: 'No updates provided' }, 400);
	params.push(id);
	db.prepare(`UPDATE features SET ${updates.join(', ')} WHERE id = ?`).run(...params);

	const updated = db.prepare('SELECT * FROM features WHERE id = ?').get(id);
	return c.json(updated);
});

// --- Feature Documents ---

// GET /api/features/:id/documents
app.get('/:id/documents', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	const type = c.req.query('type');

	let query = 'SELECT id, feature_id, type, name, created_at, updated_at, LENGTH(content) as size FROM feature_documents WHERE feature_id = ?';
	const params: any[] = [id];
	if (type) { query += ' AND type = ?'; params.push(type); }
	query += ' ORDER BY type, name';

	return c.json(db.prepare(query).all(...params));
});

// GET /api/features/:id/documents/:docId
app.get('/:id/documents/:docId', (c) => {
	const db = getDb();
	const docId = parseInt(c.req.param('docId'));
	const doc = db.prepare('SELECT * FROM feature_documents WHERE id = ? AND feature_id = ?')
		.get(docId, parseInt(c.req.param('id')));
	if (!doc) return c.json({ error: 'Document not found' }, 404);
	return c.json(doc);
});

// POST /api/features/:id/documents
app.post('/:id/documents', async (c) => {
	const db = getDb();
	const featureId = parseInt(c.req.param('id'));
	const body = await c.req.json<{ type: string; name: string; content?: string }>();

	if (!body.type || !body.name) return c.json({ error: 'type and name are required' }, 400);

	try {
		const result = db.prepare(
			'INSERT INTO feature_documents (feature_id, type, name, content) VALUES (?, ?, ?, ?)'
		).run(featureId, body.type, body.name, body.content ?? '');

		const doc = db.prepare('SELECT * FROM feature_documents WHERE id = ?').get(result.lastInsertRowid);
		return c.json(doc, 201);
	} catch (e: any) {
		if (e.message.includes('UNIQUE')) {
			return c.json({ error: `Document "${body.type}/${body.name}" already exists` }, 409);
		}
		return c.json({ error: e.message }, 500);
	}
});

// PUT /api/features/:id/documents/:docId
app.put('/:id/documents/:docId', async (c) => {
	const db = getDb();
	const docId = parseInt(c.req.param('docId'));
	const body = await c.req.json<{ content: string }>();

	const result = db.prepare(
		"UPDATE feature_documents SET content = ?, updated_at = datetime('now') WHERE id = ? AND feature_id = ?"
	).run(body.content, docId, parseInt(c.req.param('id')));

	if (result.changes === 0) return c.json({ error: 'Document not found' }, 404);
	const doc = db.prepare('SELECT * FROM feature_documents WHERE id = ?').get(docId);
	return c.json(doc);
});

// DELETE /api/features/:id/documents/:docId
app.delete('/:id/documents/:docId', (c) => {
	const db = getDb();
	const docId = parseInt(c.req.param('docId'));
	const result = db.prepare('DELETE FROM feature_documents WHERE id = ? AND feature_id = ?')
		.run(docId, parseInt(c.req.param('id')));
	if (result.changes === 0) return c.json({ error: 'Document not found' }, 404);
	return c.json({ ok: true });
});

// --- Feature Attachments ---

// GET /api/features/:id/attachments
app.get('/:id/attachments', (c) => {
	const db = getDb();
	const id = parseInt(c.req.param('id'));
	// don't return data blob in list
	const rows = db.prepare(
		'SELECT id, feature_id, name, mime_type, size, created_at FROM feature_attachments WHERE feature_id = ? ORDER BY name'
	).all(id);
	return c.json(rows);
});

// GET /api/features/:id/attachments/:attId — download
app.get('/:id/attachments/:attId', (c) => {
	const db = getDb();
	const attId = parseInt(c.req.param('attId'));
	const att = db.prepare('SELECT * FROM feature_attachments WHERE id = ? AND feature_id = ?')
		.get(attId, parseInt(c.req.param('id'))) as any;
	if (!att) return c.json({ error: 'Attachment not found' }, 404);

	return new Response(att.data, {
		headers: {
			'Content-Type': att.mime_type || 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${att.name}"`,
			'Content-Length': String(att.size),
		},
	});
});

// POST /api/features/:id/attachments — upload (multipart form)
app.post('/:id/attachments', async (c) => {
	const db = getDb();
	const featureId = parseInt(c.req.param('id'));

	const formData = await c.req.formData();
	const file = formData.get('file') as File | null;
	if (!file) return c.json({ error: 'No file uploaded' }, 400);

	const buffer = Buffer.from(await file.arrayBuffer());
	const name = file.name;
	const mimeType = file.type || 'application/octet-stream';

	try {
		const result = db.prepare(
			'INSERT INTO feature_attachments (feature_id, name, mime_type, size, data) VALUES (?, ?, ?, ?, ?)'
		).run(featureId, name, mimeType, buffer.length, buffer);

		return c.json({
			id: result.lastInsertRowid, feature_id: featureId,
			name, mime_type: mimeType, size: buffer.length,
		}, 201);
	} catch (e: any) {
		if (e.message.includes('UNIQUE')) {
			return c.json({ error: `Attachment "${name}" already exists` }, 409);
		}
		return c.json({ error: e.message }, 500);
	}
});

// DELETE /api/features/:id/attachments/:attId
app.delete('/:id/attachments/:attId', (c) => {
	const db = getDb();
	const attId = parseInt(c.req.param('attId'));
	const result = db.prepare('DELETE FROM feature_attachments WHERE id = ? AND feature_id = ?')
		.run(attId, parseInt(c.req.param('id')));
	if (result.changes === 0) return c.json({ error: 'Attachment not found' }, 404);
	return c.json({ ok: true });
});

export default app;
