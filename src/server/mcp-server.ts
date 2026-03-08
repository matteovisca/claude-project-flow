import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDb, getSettings, saveSettings } from '../db/database.js';
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
			description: 'Get current plugin settings (knowledge paths, default projects path, per-project overrides)',
			inputSchema: { type: 'object', properties: {} }
		},
		{
			name: 'settings_update',
			description: 'Update plugin settings. Pass only the fields you want to change.',
			inputSchema: {
				type: 'object',
				properties: {
					knowledge_paths: {
						type: 'array',
						items: { type: 'string' },
						description: 'Paths to shared knowledge MD files (cross-project)'
					},
					default_projects_path: {
						type: 'string',
						description: 'Default base directory for project feature docs'
					},
					project_overrides: {
						type: 'object',
						description: 'Per-project path overrides (project name → custom path)',
						additionalProperties: { type: 'string' }
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
					if (updates.length === 0) {
						return { content: [{ type: 'text', text: 'No updates provided' }] };
					}
					params.push(existing.id);
					db.prepare(`UPDATE features SET ${updates.join(', ')} WHERE id = ?`).run(...params);
					return { content: [{ type: 'text', text: `Feature "${args!.name}" updated (${existing.status} → ${statusValue ?? existing.status})` }] };
				} else {
					// insert
					const result = db.prepare(
						'INSERT INTO features (project_id, name, branch, status) VALUES (?, ?, ?, ?)'
					).run(projectRow.id, args!.name, args?.branch ?? null, args?.status ?? 'draft');
					return { content: [{ type: 'text', text: `Feature "${args!.name}" created (id: ${result.lastInsertRowid})` }] };
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
				const { readdirSync, readFileSync, statSync } = await import('fs');
				const { join, basename, extname } = await import('path');
				const { createHash } = await import('crypto');

				// collect all .md files to index
				const files: { path: string; project?: string; category?: string }[] = [];

				function walkDir(dir: string, project?: string, category?: string) {
					try {
						for (const entry of readdirSync(dir, { withFileTypes: true })) {
							const full = join(dir, entry.name);
							if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'Archive') {
								// infer category from directory name
								const cat = ['patterns', 'conventions', 'libraries'].includes(entry.name)
									? entry.name.replace(/s$/, '') : category;
								walkDir(full, project, cat);
							} else if (entry.isFile() && extname(entry.name) === '.md') {
								files.push({ path: full, project, category: category ?? 'general' });
							}
						}
					} catch { /* skip unreadable dirs */ }
				}

				if (args?.path) {
					// index a single file or directory
					const targetPath = args.path as string;
					try {
						const stat = statSync(targetPath);
						if (stat.isFile()) {
							// single file — infer project and category from path
							const pathParts = targetPath.split('/');
							const featIdx = pathParts.indexOf('features');
							const proj = args?.project as string | undefined ??
								(featIdx > 0 ? pathParts[featIdx - 1] : undefined);
							const reqIdx = pathParts.indexOf('requirements');
							const cat = reqIdx >= 0 ? 'requirement' : 'general';
							files.push({ path: targetPath, project: proj, category: cat });
						} else {
							walkDir(targetPath, args?.project as string | undefined);
						}
					} catch (e: any) {
						return { content: [{ type: 'text', text: `Path not found: ${targetPath}` }], isError: true };
					}
				} else {
					// index all configured knowledge paths
					const settings = getSettings();
					for (const kp of settings.knowledge_paths) {
						walkDir(kp);
					}
					// index all project feature requirements
					if (settings.default_projects_path) {
						try {
							for (const projEntry of readdirSync(settings.default_projects_path, { withFileTypes: true })) {
								if (projEntry.isDirectory()) {
									const featuresDir = join(settings.default_projects_path, projEntry.name, 'features');
									walkDir(featuresDir, projEntry.name, 'requirement');
								}
							}
						} catch { /* no projects dir */ }
					}
				}

				// upsert each file
				let indexed = 0;
				let skipped = 0;
				const upsert = db.prepare(`
					INSERT INTO knowledge_docs (project, category, file_path, title, content, content_hash)
					VALUES (?, ?, ?, ?, ?, ?)
					ON CONFLICT(file_path) DO UPDATE SET
						project = excluded.project,
						category = excluded.category,
						title = excluded.title,
						content = excluded.content,
						content_hash = excluded.content_hash,
						updated_at = datetime('now')
					WHERE content_hash != excluded.content_hash
				`);

				for (const f of files) {
					try {
						const content = readFileSync(f.path, 'utf-8');
						const hash = createHash('md5').update(content).digest('hex');
						// extract title from first heading
						const titleMatch = content.match(/^#\s+(.+)/m);
						const title = titleMatch?.[1] ?? basename(f.path, '.md');
						const result = upsert.run(f.project ?? null, f.category, f.path, title, content, hash);
						if (result.changes > 0) indexed++;
						else skipped++;
					} catch { skipped++; }
				}

				return { content: [{ type: 'text', text: `Indexed ${indexed} file(s), ${skipped} unchanged/skipped. Total scanned: ${files.length}` }] };
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
				if (Array.isArray(args?.knowledge_paths)) current.knowledge_paths = args.knowledge_paths as string[];
				if (typeof args?.default_projects_path === 'string') current.default_projects_path = args.default_projects_path;
				if (args?.project_overrides && typeof args.project_overrides === 'object') {
					current.project_overrides = { ...current.project_overrides, ...(args.project_overrides as Record<string, string>) };
				}
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
