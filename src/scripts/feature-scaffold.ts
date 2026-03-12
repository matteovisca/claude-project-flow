// mechanical scaffolding operations for features (DB-only)
// usage: node feature-scaffold.cjs <command> [options]
// commands: init, close

import { execSync } from 'child_process';
import { basename } from 'path';
import { getDb } from '../db/database.js';
import { getGitUserName } from '../utils/git-user.js';

interface InitOptions {
	featureName: string;
	branch: string;
	description: string;
	projectName?: string;
	createBranch?: boolean;
}

interface InitResult {
	command: 'init';
	success: boolean;
	featureName: string;
	branch: string;
	featureId: number;
	error?: string;
}

interface CloseResult {
	command: 'close';
	success: boolean;
	featureName: string;
	reason: string;
	error?: string;
}

function git(cmd: string): string {
	return execSync(`git ${cmd}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function detectProjectName(): string {
	try {
		const root = git('rev-parse --show-toplevel');
		return basename(root);
	} catch {
		return basename(process.cwd());
	}
}

// --- INIT ---
function doInit(options: InitOptions): InitResult {
	const projectName = options.projectName ?? detectProjectName();
	const db = getDb();
	const gitUser = getGitUserName();

	// ensure project exists
	let projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(projectName) as any;
	if (!projRow) {
		const cwd = process.cwd();
		db.prepare('INSERT INTO projects (name, path, type) VALUES (?, ?, ?)').run(projectName, cwd, 'app');
		projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(projectName) as any;
	}

	// check for existing active feature
	const existing = db.prepare(
		'SELECT id, status FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL'
	).get(projRow.id, options.featureName) as any;

	if (existing) {
		// bump version — close old, create new
		db.prepare("UPDATE features SET closed_at = datetime('now'), status = 'superseded' WHERE id = ?").run(existing.id);
	}

	// create branch if requested
	if (options.createBranch) {
		try { git(`checkout -b ${options.branch}`); } catch { /* branch may already exist */ }
	}

	// create feature in DB
	const today = new Date().toISOString().slice(0, 10);
	const definition = `# Feature: ${options.featureName}\n\n## Description\n${options.description}\n\n## Branch\n\`${options.branch}\`\n\n## Created\n${today}\n\n## Status\ndraft\n`;

	const result = db.prepare(
		'INSERT INTO features (project_id, name, branch, status, description, definition, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
	).run(projRow.id, options.featureName, options.branch, 'draft', options.description, definition, gitUser, gitUser);

	return {
		command: 'init',
		success: true,
		featureName: options.featureName,
		branch: options.branch,
		featureId: result.lastInsertRowid as number,
	};
}

// --- CLOSE ---
function doClose(featureName: string, reason: string, status: string, projectName?: string): CloseResult {
	const project = projectName ?? detectProjectName();
	const db = getDb();
	const user = getGitUserName() ?? 'unknown';

	const projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(project) as any;
	if (!projRow) {
		return { command: 'close', success: false, featureName, reason, error: 'Project not found' };
	}

	const feature = db.prepare(
		'SELECT id FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL'
	).get(projRow.id, featureName) as any;

	if (!feature) {
		return { command: 'close', success: false, featureName, reason, error: 'Feature not found or already closed' };
	}

	// create closure document
	const today = new Date().toISOString().slice(0, 10);
	const closureContent = `# Closure: ${featureName}\n\n## Status\n${status}\n\n## Reason\n${reason}\n\n## Closed by\n${user}\n\n## Date\n${today}\n`;

	db.prepare('INSERT INTO feature_documents (feature_id, type, name, content) VALUES (?, ?, ?, ?)')
		.run(feature.id, 'closure', 'CLOSURE', closureContent);

	// update feature status
	db.prepare("UPDATE features SET status = ?, closed_at = datetime('now'), last_modified_by = ? WHERE id = ?")
		.run(status, user, feature.id);

	return {
		command: 'close',
		success: true,
		featureName,
		reason,
	};
}

// --- MAIN ---
function main() {
	const command = process.argv[2];
	const jsonOutput = process.argv.includes('--json');
	const args = process.argv.slice(3).filter(a => a !== '--json');

	let result: any;

	switch (command) {
		case 'init': {
			const opts: InitOptions = { featureName: '', branch: '', description: '' };
			for (let i = 0; i < args.length; i++) {
				switch (args[i]) {
					case '--name': opts.featureName = args[++i]; break;
					case '--branch': opts.branch = args[++i]; break;
					case '--desc': opts.description = args.slice(++i).join(' '); i = args.length; break;
					case '--project': opts.projectName = args[++i]; break;
					case '--create-branch': opts.createBranch = true; break;
				}
			}
			if (!opts.featureName || !opts.branch) {
				result = { error: 'Required: --name <name> --branch <branch> --desc <description>' };
				break;
			}
			if (!opts.description) opts.description = opts.featureName;
			result = doInit(opts);
			break;
		}

		case 'close': {
			const featureName = args[0];
			let reason = 'Cancelled';
			let status = 'cancelled';
			let projectName: string | undefined;
			for (let i = 1; i < args.length; i++) {
				switch (args[i]) {
					case '--reason': reason = args.slice(++i).join(' '); i = args.length; break;
					case '--status': status = args[++i]; break;
					case '--project': projectName = args[++i]; break;
				}
			}
			if (!featureName) { result = { error: 'Required: feature name' }; break; }
			result = doClose(featureName, reason, status, projectName);
			break;
		}

		default:
			result = { error: `Unknown command: ${command}. Use: init, close` };
	}

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (result.error) {
			console.log(`Error: ${result.error}`);
			process.exit(1);
		}
		switch (result.command) {
			case 'init':
				console.log(`Feature "${result.featureName}" inizializzata (id: ${result.featureId})`);
				console.log(`  Branch: ${result.branch}`);
				break;
			case 'close':
				console.log(`Feature "${result.featureName}" chiusa`);
				console.log(`  Reason: ${result.reason}`);
				break;
		}
	}
}

main();
