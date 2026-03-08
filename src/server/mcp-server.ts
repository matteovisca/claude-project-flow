import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getDb, getSettings, saveSettings } from '../db/database.js';
import { runSessionStart } from '../hooks/session-start.js';

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
			description: 'Update feature status or metadata',
			inputSchema: {
				type: 'object',
				properties: {
					project: { type: 'string' },
					name: { type: 'string' },
					status: { type: 'string' },
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
			description: 'Re-index knowledge files from configured paths',
			inputSchema: {
				type: 'object',
				properties: {
					path: { type: 'string', description: 'Specific path to index (optional, defaults to all configured paths)' }
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
				const updates: string[] = [];
				const params: any[] = [];
				if (args?.status) { updates.push('status = ?'); params.push(args.status); }
				if (args?.branch) { updates.push('branch = ?'); params.push(args.branch); }
				if (args?.status === 'closed') { updates.push("closed_at = datetime('now')"); }
				if (updates.length === 0) {
					return { content: [{ type: 'text', text: 'No updates provided' }] };
				}
				params.push(args!.project, args!.name);
				const result = db.prepare(`
					UPDATE features SET ${updates.join(', ')}
					WHERE project_id = (SELECT id FROM projects WHERE name = ?)
					AND name = ? AND closed_at IS NULL
				`).run(...params);
				return { content: [{ type: 'text', text: `Updated ${result.changes} row(s)` }] };
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
				// TODO: implementare indexing dei file MD
				return { content: [{ type: 'text', text: 'Knowledge indexing not yet implemented' }] };
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
				// TODO: suggest progress update if on feature branch
				console.log('claude-project-flow: session ended');
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
