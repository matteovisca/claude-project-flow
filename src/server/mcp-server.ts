import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDb, getSettings, saveSettings } from '../db/database.js';
import { getGitUserName } from '../utils/git-user.js';
import { runSessionStart } from '../hooks/session-start.js';
import { runSessionStop } from '../hooks/session-stop.js';
import { runSessionEnd } from '../hooks/session-end.js';

declare const __VERSION__: string;

const server = new Server(
	{ name: 'claude-project-flow', version: __VERSION__ ?? '0.1.0' },
	{ capabilities: { tools: {} } }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		{
			name: 'feature_list',
			description: 'List features with their status, optionally filtered by project',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string', description: 'Filter by project name' },
					status: { type: 'string', description: 'Filter by status (draft|active|paused|closed)' }
				}
			}
		},
		{
			name: 'feature_get',
			description: 'Get detail of a specific feature including paths and version history',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string' },
					name: { type: 'string' }
				},
				required: ['project', 'name']
			}
		},
		{
			name: 'feature_update',
			description: 'Update feature status or metadata. Status follows a hierarchy (draft → requirements-done → in-progress → implementation-done → documented → implemented) and cannot go backwards unless force_status is used.',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string' },
					name: { type: 'string' },
					status: { type: 'string', description: 'New status (respects hierarchy, cannot regress)' },
					force_status: { type: 'string', description: 'Force status change bypassing hierarchy check' },
					branch: { type: 'string' }
				},
				required: ['project', 'name']
			}
		},
		{
			name: 'feature_document_list',
			description: 'List all documents for a feature',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string', description: 'Project name' },
					feature: { type: 'string', description: 'Feature name' },
					type: { type: 'string', description: 'Filter by type (requirements|plan|context|doc|closure)' }
				},
				required: ['project', 'feature']
			}
		},
		{
			name: 'feature_document_read',
			description: 'Read the content of a specific feature document',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string' },
					feature: { type: 'string' },
					doc_name: { type: 'string', description: 'Document name' },
					doc_type: { type: 'string', description: 'Document type' }
				},
				required: ['project', 'feature', 'doc_name']
			}
		},
		{
			name: 'feature_document_write',
			description: 'Create or update a feature document. Creates if it does not exist, updates if it does.',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string' },
					feature: { type: 'string' },
					doc_name: { type: 'string' },
					doc_type: { type: 'string', description: 'requirements|plan|context|doc|closure' },
					content: { type: 'string' }
				},
				required: ['project', 'feature', 'doc_name', 'doc_type', 'content']
			}
		},
		{
			name: 'knowledge_search',
			description: 'Full-text search across knowledge base (cross-project)',
			inputSchema: {
				type: 'object',
				properties: {
					query: { type: 'string', description: 'Search query' },
					project: { type: 'string', description: 'Filter by project (optional)' },
					category: { type: 'string', description: 'Filter by category (pattern|library|convention)' },
					limit: { type: 'number', description: 'Max results (default 10)' }
				},
				required: ['query']
			}
		},
		{
			name: 'knowledge_index',
			description: 'Index knowledge files (MD) into the searchable knowledge base. Indexes a single file, a directory, or all configured paths.',
			inputSchema: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'Specific file or directory to index (optional, defaults to all configured paths)' },
					project: { type: 'string', description: 'Project name to associate with indexed files (optional, auto-detected from path)' }
				}
			}
		},
		{
			name: 'project_list',
			description: 'List all registered projects',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'project_register',
			description: 'Register a new project',
			inputSchema: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					path: { type: 'string' },
					type: { type: 'string', description: 'app|library|shared' }
				},
				required: ['name', 'path']
			}
		},
		{
			name: 'settings_get',
			description: 'Get current plugin settings',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'settings_update',
			description: 'Update plugin settings. Pass only the fields you want to change.',
			inputSchema: {
				type: 'object',
				properties: {
					memory_path: {
						type: 'string',
						description: 'Base directory for plugin memory (projects and knowledge)'
					}
				}
			}
		}
	]
}));

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;
	const db = getDb();

	try {
		switch (name) {
			case 'feature_list': {
				let query = `
					SELECT f.*, p.name as project_name
					FROM features f JOIN projects p ON f.project_id = p.id
					WHERE 1=1
				`;
				const params: any[] = [];
				if (args?.project) { query += ' AND p.name = ?'; params.push(args.project); }
				if (args?.status) { query += ' AND f.status = ?'; params.push(args.status); }
				query += ' ORDER BY f.created_at DESC';
				const rows = db.prepare(query).all(...params);
				return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
			}

			case 'feature_get': {
				const row = db.prepare(`
					SELECT f.*, p.name as project_name
					FROM features f JOIN projects p ON f.project_id = p.id
					WHERE p.name = ? AND f.name = ?
					ORDER BY f.version DESC
				`).all(args!.project, args!.name);
				return { content: [{ type: 'text', text: JSON.stringify(row, null, 2) }] };
			}

			case 'feature_update': {
				// status hierarchy — higher index = more advanced, cannot go backwards
				const STATUS_ORDER = ['draft', 'requirements-done', 'in-progress', 'implementation-done', 'documented', 'implemented', 'closed', 'cancelled'];

				const projectRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(args!.project) as any;
				if (!projectRow) {
					return { content: [{ type: 'text', text: `Project "${args!.project}" not found` }], isError: true };
				}
				const existing = db.prepare(
					'SELECT id, status FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL'
				).get(projectRow.id, args!.name) as any;

				const gitUser = getGitUserName();

				if (existing) {
					// check status hierarchy — prevent going backwards
					if (args?.status) {
						const currentIdx = STATUS_ORDER.indexOf(existing.status as string);
						const newIdx = STATUS_ORDER.indexOf(args.status as string);
						if (currentIdx >= 0 && newIdx >= 0 && newIdx < currentIdx) {
							return { content: [{ type: 'text', text: `Cannot change status from "${existing.status}" to "${args.status}" (would be a regression). Use force_status to override.` }] };
						}
					}

					const updates: string[] = [];
					const params: any[] = [];
					// force_status bypasses hierarchy check
					const statusValue = args?.force_status ?? args?.status;
					if (statusValue) { updates.push('status = ?'); params.push(statusValue); }
					if (args?.branch) { updates.push('branch = ?'); params.push(args.branch); }
					if (statusValue === 'closed' || statusValue === 'cancelled') { updates.push("closed_at = datetime('now')"); }
					if (gitUser) { updates.push('last_modified_by = ?'); params.push(gitUser); }
					if (updates.length === 0) {
						return { content: [{ type: 'text', text: 'No updates provided' }] };
					}
					params.push(existing.id);
					db.prepare(`UPDATE features SET ${updates.join(', ')} WHERE id = ?`).run(...params);
					return { content: [{ type: 'text', text: `Feature "${args!.name}" updated (${existing.status} → ${statusValue ?? existing.status})` }] };
				} else {
					// insert — set author on creation
					const result = db.prepare(
						'INSERT INTO features (project_id, name, branch, status, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?)'
					).run(projectRow.id, args!.name, args?.branch ?? null, args?.status ?? 'draft', gitUser, gitUser);
					return { content: [{ type: 'text', text: `Feature "${args!.name}" created (id: ${result.lastInsertRowid})` }] };
				}
			}

			case 'feature_document_list': {
				const feat = db.prepare(`
					SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
					WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
				`).get(args!.project, args!.feature) as any;
				if (!feat) return { content: [{ type: 'text', text: `Feature "${args!.feature}" not found in project "${args!.project}"` }], isError: true };
				let q = 'SELECT id, type, name, LENGTH(content) as size, created_at, updated_at FROM feature_documents WHERE feature_id = ?';
				const p: any[] = [feat.id];
				if (args?.type) { q += ' AND type = ?'; p.push(args.type); }
				q += ' ORDER BY type, name';
				const docs = db.prepare(q).all(...p);
				return { content: [{ type: 'text', text: JSON.stringify(docs, null, 2) }] };
			}

			case 'feature_document_read': {
				const feat = db.prepare(`
					SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
					WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
				`).get(args!.project, args!.feature) as any;
				if (!feat) return { content: [{ type: 'text', text: `Feature not found` }], isError: true };
				let q = 'SELECT * FROM feature_documents WHERE feature_id = ? AND name = ?';
				const p: any[] = [feat.id, args!.doc_name];
				if (args?.doc_type) { q += ' AND type = ?'; p.push(args.doc_type); }
				const doc = db.prepare(q).get(...p) as any;
				if (!doc) return { content: [{ type: 'text', text: `Document "${args!.doc_name}" not found` }], isError: true };
				return { content: [{ type: 'text', text: doc.content }] };
			}

			case 'feature_document_write': {
				const feat = db.prepare(`
					SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
					WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
				`).get(args!.project, args!.feature) as any;
				if (!feat) return { content: [{ type: 'text', text: `Feature not found` }], isError: true };
				const existing = db.prepare(
					'SELECT id FROM feature_documents WHERE feature_id = ? AND type = ? AND name = ?'
				).get(feat.id, args!.doc_type, args!.doc_name) as any;
				if (existing) {
					db.prepare("UPDATE feature_documents SET content = ?, updated_at = datetime('now') WHERE id = ?")
						.run(args!.content, existing.id);
					return { content: [{ type: 'text', text: `Document "${args!.doc_name}" updated` }] };
				} else {
					const result = db.prepare(
						'INSERT INTO feature_documents (feature_id, type, name, content) VALUES (?, ?, ?, ?)'
					).run(feat.id, args!.doc_type, args!.doc_name, args!.content);
					return { content: [{ type: 'text', text: `Document "${args!.doc_name}" created (id: ${result.lastInsertRowid})` }] };
				}
			}

			case 'knowledge_search': {
				let query = `
					SELECT d.id, d.project, d.category, d.file_path, d.title,
						snippet(knowledge_fts, 1, '>>>', '<<<', '...', 40) as excerpt,
						rank
					FROM knowledge_fts f
					JOIN knowledge_docs d ON f.rowid = d.id
					WHERE knowledge_fts MATCH ?
				`;
				const params: any[] = [args!.query];
				if (args?.project) { query += ' AND d.project = ?'; params.push(args.project); }
				if (args?.category) { query += ' AND d.category = ?'; params.push(args.category); }
				query += ` ORDER BY rank LIMIT ?`;
				params.push(args?.limit ?? 10);
				const rows = db.prepare(query).all(...params);
				return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
			}

			case 'knowledge_index': {
				const { createHash } = await import('crypto');

				// index feature documents into knowledge_docs for cross-project search
				const featureDocs = db.prepare(`
					SELECT fd.id, fd.type, fd.name, fd.content, f.name as feature_name, p.name as project_name
					FROM feature_documents fd
					JOIN features f ON fd.feature_id = f.id
					JOIN projects p ON f.project_id = p.id
				`).all() as any[];

				let indexed = 0;
				let skipped = 0;

				const upsert = db.prepare(`
					INSERT INTO knowledge_docs (project, category, title, content, content_hash, source)
					VALUES (?, ?, ?, ?, ?, ?)
					ON CONFLICT(content_hash) DO UPDATE SET
						updated_at = datetime('now')
				`);

				for (const doc of featureDocs) {
					const hash = createHash('md5').update(doc.content || '').digest('hex');
					const title = `${doc.project_name}/${doc.feature_name}: ${doc.name}`;
					const category = doc.type === 'requirements' ? 'requirement' : doc.type;
					try {
						// check if already indexed with same hash
						const existing = db.prepare('SELECT id FROM knowledge_docs WHERE content_hash = ?').get(hash);
						if (existing) { skipped++; continue; }
						upsert.run(doc.project_name, category, title, doc.content, hash, 'feature-doc');
						indexed++;
					} catch { skipped++; }
				}

				return { content: [{ type: 'text', text: `Indexed ${indexed} document(s) from DB, ${skipped} unchanged/skipped. Total: ${featureDocs.length}` }] };
			}

			case 'project_list': {
				const rows = db.prepare('SELECT * FROM projects ORDER BY name').all();
				return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
			}

			case 'project_register': {
				const result = db.prepare(
					'INSERT OR REPLACE INTO projects (name, path, type) VALUES (?, ?, ?)'
				).run(args!.name, args!.path, args?.type ?? 'app');
				return { content: [{ type: 'text', text: `Project "${args!.name}" registered (id: ${result.lastInsertRowid})` }] };
			}

			case 'settings_get': {
				const settings = getSettings();
				return { content: [{ type: 'text', text: JSON.stringify(settings, null, 2) }] };
			}

			case 'settings_update': {
				const current = getSettings();
				if (typeof args?.memory_path === 'string') current.memory_path = args.memory_path;
				saveSettings(current);
				return { content: [{ type: 'text', text: `Settings updated:\n${JSON.stringify(current, null, 2)}` }] };
			}

			default:
				return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
		}
	} catch (error: any) {
		return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
	}
});

// Hook CLI mode
async function main() {
	const cliArg = process.argv[2];
	if (cliArg === 'hook') {
		const hookName = process.argv[3];
		switch (hookName) {
			case 'session-start': {
				runSessionStart();
				break;
			}
			case 'session-stop': {
				runSessionStop();
				break;
			}
			case 'session-end': {
				runSessionEnd();
				break;
			}
		}
		process.exit(0);
	} else {
		// MCP server mode
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}
}

main();
