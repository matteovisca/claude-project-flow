import { useState } from 'react';

type Section = 'skills' | 'scripts' | 'mcp' | 'architecture';

const SKILLS = [
	{ name: 'setup-permissions', group: 'Setup', desc: 'Authorize all required plugin permissions in one step', scripts: ['setup-permissions.cjs'], mcp: [] },
	{ name: 'project-init', group: 'Setup', desc: 'Analyze codebase, create project definition, register in DB', scripts: [], mcp: ['project_register'] },
	{ name: 'feature-init', group: 'Feature Lifecycle', desc: 'Create feature branch and register in DB with definition', scripts: ['feature-scaffold.cjs'], mcp: ['feature_update', 'knowledge_search'] },
	{ name: 'feature-requirements', group: 'Feature Lifecycle', desc: 'Collect detailed requirements through structured dialogue until >95% coverage', scripts: [], mcp: ['feature_get', 'feature_update', 'feature_document_write', 'knowledge_search', 'knowledge_index'] },
	{ name: 'feature-plan', group: 'Feature Lifecycle', desc: 'Create and manage implementation plans with phases and steps', scripts: [], mcp: ['feature_get', 'feature_update', 'feature_document_read', 'feature_document_write', 'knowledge_search'] },
	{ name: 'feature-list', group: 'Feature Lifecycle', desc: 'Dashboard of all features across projects with status and progress', scripts: [], mcp: ['project_list', 'feature_list', 'feature_get', 'feature_document_list'] },
	{ name: 'feature-docs', group: 'Feature Lifecycle', desc: 'Generate comprehensive documentation from DB data and code changes', scripts: ['git-ops.cjs'], mcp: ['feature_get', 'feature_document_list', 'feature_document_read', 'feature_document_write', 'knowledge_index', 'feature_update'] },
	{ name: 'feature-merge', group: 'Feature Lifecycle', desc: 'Merge feature branch into main and update DB status', scripts: ['git-ops.cjs'], mcp: ['feature_get', 'feature_update'] },
	{ name: 'feature-close', group: 'Feature Lifecycle', desc: 'Close or cancel a feature — update DB and optionally delete branch', scripts: ['feature-scaffold.cjs'], mcp: ['feature_get', 'feature_update'] },
	{ name: 'session-save', group: 'Development', desc: 'Sync session progress — update plans, requirements, session log in DB', scripts: ['git-ops.cjs', 'context-loader.cjs'], mcp: ['feature_get', 'feature_update', 'feature_document_read', 'feature_document_write'] },
	{ name: 'discover-patterns', group: 'Development', desc: 'Detect new patterns, libraries, and dependency changes from git diff', scripts: ['git-ops.cjs'], mcp: ['feature_get', 'feature_update', 'feature_document_write', 'knowledge_index'] },
	{ name: 'man', group: 'Utilities', desc: 'Interactive manual — list all skills, scripts, and commands', scripts: ['man.cjs'], mcp: [] },
	{ name: 'project-git', group: 'Utilities', desc: 'Run git log/diff/status on a registered project', scripts: ['project-git.cjs'], mcp: [] },
];

const SCRIPTS = [
	{ name: 'context-loader', desc: 'Load feature/project context from DB as structured JSON', commands: ['<feature>', '--project <name>', '--json'] },
	{ name: 'git-ops', desc: 'Pre-processed git operations as structured JSON', commands: ['diff', 'log', 'merge-check', 'branch-info'] },
	{ name: 'feature-scaffold', desc: 'Feature init and close operations in DB', commands: ['init', 'close'] },
	{ name: 'project-git', desc: 'Git log/diff/status on a registered project', commands: ['<project> log', '<project> diff', '<project> status'] },
	{ name: 'man', desc: 'Interactive manual — list skills, scripts and commands', commands: ['[topic]'] },
	{ name: 'setup-permissions', desc: 'Configure all required permissions for the plugin', commands: ['list', 'apply'] },
];

const MCP_TOOLS = [
	{ name: 'feature_list', desc: 'List all features, optionally filtered by project or status' },
	{ name: 'feature_get', desc: 'Get detail of a specific feature including definition, session log, status fields' },
	{ name: 'feature_update', desc: 'Update feature status or metadata (follows status hierarchy)' },
	{ name: 'feature_document_list', desc: 'List all documents of a feature, optionally filtered by type' },
	{ name: 'feature_document_read', desc: 'Read the content of a specific feature document' },
	{ name: 'feature_document_write', desc: 'Create or update a feature document (upsert by type+name)' },
	{ name: 'knowledge_search', desc: 'Full-text search across indexed knowledge docs (FTS5)' },
	{ name: 'knowledge_index', desc: 'Index markdown files into the searchable knowledge base' },
	{ name: 'project_list', desc: 'List all registered projects' },
	{ name: 'project_register', desc: 'Register a new project with name, path, and type' },
	{ name: 'settings_get', desc: 'Get current plugin settings' },
	{ name: 'settings_update', desc: 'Update plugin settings' },
];

const WORKFLOW = [
	{ step: 1, command: '/project-init', desc: 'Register the project in DB' },
	{ step: 2, command: '/feature-init', desc: 'Create feature branch and register in DB' },
	{ step: 3, command: '/feature-requirements', desc: 'Structured requirements collection dialogue' },
	{ step: 4, command: '/feature-plan', desc: 'Plan implementation phases and steps' },
	{ step: 5, command: '...implementation...', desc: 'Write code on the feature branch' },
	{ step: 6, command: '/session-save', desc: 'Sync progress to DB' },
	{ step: 7, command: '/discover-patterns', desc: 'Detect patterns from git diff' },
	{ step: 8, command: '/feature-docs', desc: 'Generate feature documentation' },
	{ step: 9, command: '/feature-merge', desc: 'Merge to main, update status' },
];

const STATUS_HIERARCHY = ['draft', 'requirements-done', 'in-progress', 'implementation-done', 'documented', 'implemented', 'closed'];

export default function Documentation() {
	const [section, setSection] = useState<Section>('skills');

	const groups = [...new Set(SKILLS.map(s => s.group))];

	return (
		<div className="page">
			<h1 className="page-title">
				<i className="fa-solid fa-book" style={{ marginRight: 10, opacity: 0.7 }} />
				Documentation
			</h1>

			<div className="doc-tabs">
				{([
					['skills', 'fa-solid fa-wand-magic-sparkles', 'Skills'],
					['scripts', 'fa-solid fa-terminal', 'Scripts'],
					['mcp', 'fa-solid fa-plug', 'MCP Tools'],
					['architecture', 'fa-solid fa-sitemap', 'Architecture'],
				] as [Section, string, string][]).map(([key, icon, label]) => (
					<button
						key={key}
						className={section === key ? 'active' : ''}
						onClick={() => setSection(key)}
					>
						<i className={icon} style={{ marginRight: 6 }} />
						{label}
					</button>
				))}
			</div>

			{section === 'skills' && (
				<div className="doc-section">
					{groups.map(group => (
						<div key={group}>
							<h2 className="doc-group-title">{group}</h2>
							{SKILLS.filter(s => s.group === group).map(skill => (
								<div key={skill.name} className="card doc-card">
									<div className="card-header">
										<span className="card-title">
											<code>/{skill.name}</code>
										</span>
									</div>
									<p className="doc-desc">{skill.desc}</p>
									<div className="doc-deps">
										{skill.scripts.length > 0 && (
											<div className="doc-dep-row">
												<i className="fa-solid fa-terminal doc-dep-icon" />
												{skill.scripts.map(s => <code key={s} className="doc-tag script">{s}</code>)}
											</div>
										)}
										{skill.mcp.length > 0 && (
											<div className="doc-dep-row">
												<i className="fa-solid fa-plug doc-dep-icon" />
												{skill.mcp.map(t => <code key={t} className="doc-tag mcp">{t}</code>)}
											</div>
										)}
										{skill.scripts.length === 0 && skill.mcp.length === 0 && (
											<span className="doc-no-deps">No external dependencies</span>
										)}
									</div>
								</div>
							))}
						</div>
					))}
				</div>
			)}

			{section === 'scripts' && (
				<div className="doc-section">
					<p className="doc-intro">
						CLI scripts compiled to <code>.cjs</code> bundles. Run via <code>node script.cjs [command] [args]</code> or from the Commands page.
					</p>
					{SCRIPTS.map(script => (
						<div key={script.name} className="card doc-card">
							<div className="card-header">
								<span className="card-title">
									<code>{script.name}.cjs</code>
								</span>
							</div>
							<p className="doc-desc">{script.desc}</p>
							<div className="doc-commands">
								{script.commands.map(cmd => (
									<code key={cmd} className="doc-tag command">{cmd}</code>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{section === 'mcp' && (
				<div className="doc-section">
					<p className="doc-intro">
						MCP tools registered by the plugin server. Called by skills via <code>project_flow__&lt;tool&gt;</code>.
					</p>
					{MCP_TOOLS.map(tool => (
						<div key={tool.name} className="card doc-card">
							<div className="card-header">
								<span className="card-title">
									<code>{tool.name}</code>
								</span>
							</div>
							<p className="doc-desc">{tool.desc}</p>
						</div>
					))}
				</div>
			)}

			{section === 'architecture' && (
				<div className="doc-section">
					<h2 className="doc-group-title">Typical Workflow</h2>
					<div className="card doc-card">
						<div className="doc-workflow">
							{WORKFLOW.map((w, i) => (
								<div key={w.step} className="doc-workflow-step">
									<span className="doc-step-num">{w.step}</span>
									<code className="doc-step-cmd">{w.command}</code>
									<span className="doc-step-desc">{w.desc}</span>
									{i < WORKFLOW.length - 1 && <div className="doc-step-arrow"><i className="fa-solid fa-arrow-down" /></div>}
								</div>
							))}
						</div>
					</div>

					<h2 className="doc-group-title">Feature Status Hierarchy</h2>
					<div className="card doc-card">
						<div className="doc-status-chain">
							{STATUS_HIERARCHY.map((s, i) => (
								<span key={s}>
									<code className="doc-tag status">{s}</code>
									{i < STATUS_HIERARCHY.length - 1 && <i className="fa-solid fa-arrow-right doc-chain-arrow" />}
								</span>
							))}
						</div>
					</div>

					<h2 className="doc-group-title">Data Architecture</h2>
					<div className="card doc-card">
						<pre className="doc-tree">{`SQLite Database (~/.claude-project-flow/project-flow.db)
├── projects              — registered projects (name, path, type, definition)
├── features              — feature lifecycle (status, definition, session_log, plans_status...)
├── feature_documents     — typed documents (requirements, plan, context, doc, closure)
├── feature_attachments   — binary attachments (files, images)
├── knowledge_docs        — cross-project knowledge base
├── knowledge_fts         — FTS5 index for knowledge search
└── feature_docs_fts      — FTS5 index for document search`}</pre>
					</div>

					<h2 className="doc-group-title">System Components</h2>
					<div className="card doc-card">
						<div className="doc-components">
							<div className="doc-component">
								<i className="fa-solid fa-database" />
								<strong>SQLite DB</strong>
								<span>projects, features, documents, knowledge (FTS5)</span>
							</div>
							<div className="doc-component">
								<i className="fa-solid fa-server" />
								<strong>MCP Server</strong>
								<span>service.cjs — 12 tools for Claude integration</span>
							</div>
							<div className="doc-component">
								<i className="fa-solid fa-display" />
								<strong>Dashboard</strong>
								<span>Hono + React — port 3700, self-contained HTML</span>
							</div>
							<div className="doc-component">
								<i className="fa-solid fa-bell" />
								<strong>Hooks</strong>
								<span>SessionStart, SessionStop, SessionEnd — auto lifecycle</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
