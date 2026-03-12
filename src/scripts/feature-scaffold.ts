// mechanical scaffolding operations for features
// usage: node feature-scaffold.cjs <command> [options]
// commands: init, archive, close

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { getSettings, getDb } from '../db/database.js';
import { getGitUserName } from '../utils/git-user.js';
import { updateFooter } from '../utils/doc-signature.js';

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
	featureDir: string;
	archived?: string;
	error?: string;
}

interface ArchiveResult {
	command: 'archive';
	success: boolean;
	featureDir: string;
	archiveVersion: number;
	archivePath: string;
	error?: string;
}

interface CloseResult {
	command: 'close';
	success: boolean;
	featureName: string;
	featureDir: string;
	reason: string;
	closureFile: string;
	archived?: string;
	error?: string;
}

function git(cmd: string): string {
	return execSync(`git ${cmd}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function resolveFeatureDir(projectName: string, featureName: string): string {
	const settings = getSettings();
	const projectPath = settings.project_overrides[projectName]
		?? join(settings.default_projects_path, projectName);
	return join(projectPath, 'features', featureName);
}

function detectProjectName(): string {
	try {
		const root = git('rev-parse --show-toplevel');
		return basename(root);
	} catch {
		return basename(process.cwd());
	}
}

function getNextArchiveVersion(featureDir: string): number {
	const archiveDir = join(featureDir, 'Archive');
	if (!existsSync(archiveDir)) return 1;
	try {
		const versions = readdirSync(archiveDir)
			.filter(d => /^v\d+$/.test(d))
			.map(d => parseInt(d.substring(1)))
			.sort((a, b) => b - a);
		return (versions[0] ?? 0) + 1;
	} catch { return 1; }
}

function archiveFeature(featureDir: string): { version: number; path: string } | null {
	if (!existsSync(featureDir)) return null;

	const version = getNextArchiveVersion(featureDir);
	const archivePath = join(featureDir, 'Archive', `v${version}`);
	mkdirSync(archivePath, { recursive: true });

	// move all root-level content except Archive/
	for (const entry of readdirSync(featureDir)) {
		if (entry === 'Archive') continue;
		renameSync(join(featureDir, entry), join(archivePath, entry));
	}

	return { version, path: archivePath };
}

// --- INIT ---
function doInit(options: InitOptions): InitResult {
	const projectName = options.projectName ?? detectProjectName();
	const featureDir = resolveFeatureDir(projectName, options.featureName);

	// handle versioning if dir exists
	let archived: string | undefined;
	if (existsSync(featureDir) && existsSync(join(featureDir, 'feature-definition.md'))) {
		const result = archiveFeature(featureDir);
		if (result) archived = `Archive/v${result.version}`;
	}

	// create directory structure
	mkdirSync(join(featureDir, 'context'), { recursive: true });
	mkdirSync(join(featureDir, 'plans'), { recursive: true });
	mkdirSync(join(featureDir, 'requirements'), { recursive: true });

	// create branch if requested
	if (options.createBranch) {
		try {
			git(`checkout -b ${options.branch}`);
		} catch { /* branch may already exist */ }
	}

	// write feature-definition.md
	const today = new Date().toISOString().slice(0, 10);
	let definition = `# Feature: ${options.featureName}

## Description
${options.description}

## Branch
\`${options.branch}\`

## Created
${today}

## Status
draft
`;

	definition = updateFooter(definition, 'Feature inizializzata');
	writeFileSync(join(featureDir, 'feature-definition.md'), definition);

	return {
		command: 'init',
		success: true,
		featureName: options.featureName,
		branch: options.branch,
		featureDir,
		archived,
	};
}

// --- ARCHIVE ---
function doArchive(featureName: string, projectName?: string): ArchiveResult {
	const project = projectName ?? detectProjectName();
	const featureDir = resolveFeatureDir(project, featureName);

	if (!existsSync(featureDir)) {
		return { command: 'archive', success: false, featureDir, archiveVersion: 0, archivePath: '', error: 'Feature directory not found' };
	}

	const result = archiveFeature(featureDir);
	if (!result) {
		return { command: 'archive', success: false, featureDir, archiveVersion: 0, archivePath: '', error: 'Nothing to archive' };
	}

	return {
		command: 'archive',
		success: true,
		featureDir,
		archiveVersion: result.version,
		archivePath: result.path,
	};
}

// --- CLOSE ---
function doClose(featureName: string, reason: string, status: string, projectName?: string): CloseResult {
	const project = projectName ?? detectProjectName();
	const featureDir = resolveFeatureDir(project, featureName);

	if (!existsSync(featureDir)) {
		return { command: 'close', success: false, featureName, featureDir, reason, closureFile: '', error: 'Feature directory not found' };
	}

	// archive current state
	let archived: string | undefined;
	const archiveResult = archiveFeature(featureDir);
	if (archiveResult) archived = `Archive/v${archiveResult.version}`;

	// recreate minimal structure
	mkdirSync(join(featureDir, 'context'), { recursive: true });

	// create CLOSURE.md
	const today = new Date().toISOString().slice(0, 10);
	const user = getGitUserName() ?? 'unknown';
	let closure = `# Closure: ${featureName}

## Status
${status}

## Reason
${reason}

## Closed by
${user}

## Date
${today}

## Archived
${archived ?? 'N/A'}
`;

	closure = updateFooter(closure, `Feature chiusa: ${status}`);
	const closureFile = join(featureDir, 'CLOSURE.md');
	writeFileSync(closureFile, closure);

	// update DB
	try {
		const db = getDb();
		const projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(project) as any;
		if (projRow) {
			db.prepare(
				"UPDATE features SET status = ?, closed_at = datetime('now'), last_modified_by = ? WHERE project_id = ? AND name = ? AND closed_at IS NULL"
			).run(status, user, projRow.id, featureName);
		}
	} catch { /* DB update failed, not critical */ }

	return {
		command: 'close',
		success: true,
		featureName,
		featureDir,
		reason,
		closureFile,
		archived,
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
			// parse args: --name <name> --branch <branch> --desc <desc> [--project <proj>] [--create-branch]
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

		case 'archive': {
			const featureName = args[0];
			const projectName = args.includes('--project') ? args[args.indexOf('--project') + 1] : undefined;
			if (!featureName) { result = { error: 'Required: feature name' }; break; }
			result = doArchive(featureName, projectName);
			break;
		}

		case 'close': {
			// parse: <feature-name> --reason <reason> --status <cancelled|deferred>
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
			result = { error: `Unknown command: ${command}. Use: init, archive, close` };
	}

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (result.error) {
			console.log(`❌ ${result.error}`);
			process.exit(1);
		}
		switch (result.command) {
			case 'init':
				console.log(`\n✅ Feature "${result.featureName}" inizializzata`);
				console.log(`  Branch: ${result.branch}`);
				console.log(`  Dir: ${result.featureDir}`);
				if (result.archived) console.log(`  Archiviato: ${result.archived}`);
				break;
			case 'archive':
				console.log(`\n📦 Archiviato in v${result.archiveVersion}`);
				console.log(`  Path: ${result.archivePath}`);
				break;
			case 'close':
				console.log(`\n🔒 Feature "${result.featureName}" chiusa`);
				console.log(`  Reason: ${result.reason}`);
				console.log(`  Closure: ${result.closureFile}`);
				if (result.archived) console.log(`  Archiviato: ${result.archived}`);
				break;
		}
	}
}

main();
