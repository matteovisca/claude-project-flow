#!/usr/bin/env node
// standalone sync CLI — usable from skill or directly from terminal
// usage: node sync.cjs [pull|push|status|all]

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getDb, getSettings } from '../db/database.js';
import { reconcile, type ReconcileResult } from './reconciler.js';
import { scanAllPaths } from './project-scanner.js';

interface SyncResult {
	command: string;
	success: boolean;
	pull?: PullResult;
	reconcile?: ReconcileResult;
	push?: PushResult;
	status?: StatusResult;
	error?: string;
}

interface PullResult {
	output: string;
	conflicts: string[];
	hasConflicts: boolean;
}

interface PushResult {
	summary: string;
	committed: boolean;
	pushed: boolean;
	output: string;
}

interface StatusResult {
	hasRemote: boolean;
	isGitRepo: boolean;
	localChanges: string[];
	behindRemote: boolean;
	aheadOfRemote: boolean;
	dbDifferences: string[];
}

function getDocsPath(): string {
	const settings = getSettings();
	return settings.default_projects_path;
}

function isGitRepo(path: string): boolean {
	try {
		execSync('git rev-parse --is-inside-work-tree', { cwd: path, stdio: 'pipe' });
		return true;
	} catch { return false; }
}

function hasRemote(path: string): boolean {
	try {
		const output = execSync('git remote', { cwd: path, encoding: 'utf-8', stdio: 'pipe' }).trim();
		return output.length > 0;
	} catch { return false; }
}

function gitExec(cmd: string, cwd: string): string {
	return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

// --- PULL ---
function doPull(docsPath: string): PullResult {
	if (!isGitRepo(docsPath)) {
		return { output: '', conflicts: [], hasConflicts: false };
	}
	if (!hasRemote(docsPath)) {
		return { output: 'No remote configured', conflicts: [], hasConflicts: false };
	}

	let output: string;
	let conflicts: string[] = [];
	try {
		output = gitExec('git pull --no-rebase', docsPath);
	} catch (e: any) {
		output = e.stdout?.toString() ?? e.message;
		// detect merge conflicts
		try {
			const status = gitExec('git status --porcelain', docsPath);
			conflicts = status.split('\n')
				.filter(l => l.startsWith('UU') || l.startsWith('AA') || l.startsWith('DD'))
				.map(l => l.substring(3).trim());
		} catch { /* ignore */ }
	}

	return {
		output,
		conflicts,
		hasConflicts: conflicts.length > 0,
	};
}

// --- PUSH ---
function doPush(docsPath: string): PushResult {
	if (!isGitRepo(docsPath)) {
		return { summary: 'Not a git repo', committed: false, pushed: false, output: '' };
	}
	if (!hasRemote(docsPath)) {
		return { summary: 'No remote configured', committed: false, pushed: false, output: '' };
	}

	// check for changes
	const status = gitExec('git status --porcelain', docsPath);
	if (!status) {
		return { summary: 'No changes to push', committed: false, pushed: false, output: '' };
	}

	// build summary from changed files
	const lines = status.split('\n').filter(Boolean);
	const summary = buildCommitSummary(lines);

	// stage all, commit, push
	let output = '';
	try {
		gitExec('git add -A', docsPath);
		output += gitExec(`git commit -m "${summary}"`, docsPath) + '\n';
		output += gitExec('git push', docsPath);
		return { summary, committed: true, pushed: true, output };
	} catch (e: any) {
		return { summary, committed: false, pushed: false, output: e.message };
	}
}

function buildCommitSummary(statusLines: string[]): string {
	const changes: string[] = [];
	for (const line of statusLines) {
		const file = line.substring(3).trim();
		// extract meaningful info from path
		const parts = file.split('/');
		const featureIdx = parts.indexOf('features');
		if (featureIdx >= 0 && featureIdx + 1 < parts.length) {
			const feature = parts[featureIdx + 1];
			const type = parts[featureIdx + 2] ?? 'definition';
			changes.push(`${feature}/${type}`);
		} else {
			changes.push(parts[parts.length - 1]);
		}
	}

	const unique = [...new Set(changes)];
	const desc = unique.length <= 3
		? unique.join(', ')
		: `${unique.slice(0, 3).join(', ')} (+${unique.length - 3})`;

	return `docs: sync ${desc}`;
}

// --- STATUS ---
function doStatus(docsPath: string): StatusResult {
	const result: StatusResult = {
		hasRemote: false,
		isGitRepo: false,
		localChanges: [],
		behindRemote: false,
		aheadOfRemote: false,
		dbDifferences: [],
	};

	result.isGitRepo = isGitRepo(docsPath);
	if (!result.isGitRepo) return result;

	result.hasRemote = hasRemote(docsPath);

	// local changes
	const status = gitExec('git status --porcelain', docsPath);
	if (status) {
		result.localChanges = status.split('\n').filter(Boolean);
	}

	// remote status
	if (result.hasRemote) {
		try {
			gitExec('git fetch --quiet', docsPath);
			const ahead = gitExec('git rev-list HEAD --not @{upstream} --count', docsPath);
			const behind = gitExec('git rev-list @{upstream} --not HEAD --count', docsPath);
			result.aheadOfRemote = parseInt(ahead) > 0;
			result.behindRemote = parseInt(behind) > 0;
		} catch { /* no upstream tracking */ }
	}

	// DB vs file differences
	const scanned = scanAllPaths();
	const db = getDb();
	for (const project of scanned) {
		const projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(project.name) as any;
		if (!projRow) {
			result.dbDifferences.push(`Project "${project.name}" exists in files but not in DB`);
			continue;
		}
		for (const feat of project.features) {
			const dbFeat = db.prepare(
				'SELECT status, branch FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL'
			).get(projRow.id, feat.metadata.name) as any;
			if (!dbFeat) {
				result.dbDifferences.push(`Feature "${project.name}/${feat.metadata.name}" exists in files but not in DB`);
			} else if (dbFeat.status !== feat.metadata.status) {
				result.dbDifferences.push(`Feature "${project.name}/${feat.metadata.name}" status: DB="${dbFeat.status}" file="${feat.metadata.status}"`);
			}
		}
	}

	return result;
}

// --- MAIN ---
function main() {
	const command = process.argv[2] || 'all';
	const jsonOutput = process.argv.includes('--json');
	const docsPath = getDocsPath();

	if (!docsPath || !existsSync(docsPath)) {
		const result: SyncResult = {
			command,
			success: false,
			error: `Docs path not configured or doesn't exist: ${docsPath}. Run /claude-project-flow:setup first.`,
		};
		output(result, jsonOutput);
		process.exit(1);
	}

	let result: SyncResult;

	switch (command) {
		case 'pull': {
			const pullResult = doPull(docsPath);
			if (pullResult.hasConflicts) {
				result = {
					command, success: false, pull: pullResult,
					error: `Conflicts detected in: ${pullResult.conflicts.join(', ')}. Resolve manually then run /sync again.`,
				};
			} else {
				const reconcileResult = reconcile();
				result = { command, success: true, pull: pullResult, reconcile: reconcileResult };
			}
			break;
		}

		case 'push': {
			const pushResult = doPush(docsPath);
			result = { command, success: pushResult.pushed || !pushResult.summary.includes('No'), push: pushResult };
			break;
		}

		case 'status': {
			const statusResult = doStatus(docsPath);
			result = { command, success: true, status: statusResult };
			break;
		}

		case 'all': {
			// full flow: pull → reconcile → push
			const pullResult = doPull(docsPath);
			if (pullResult.hasConflicts) {
				result = {
					command, success: false, pull: pullResult,
					error: `Conflicts detected in: ${pullResult.conflicts.join(', ')}. Resolve manually then run /sync again.`,
				};
				break;
			}
			const reconcileResult = reconcile();
			const pushResult = doPush(docsPath);
			result = { command, success: true, pull: pullResult, reconcile: reconcileResult, push: pushResult };
			break;
		}

		default:
			result = { command, success: false, error: `Unknown command: ${command}. Use: pull, push, status, all` };
	}

	output(result, jsonOutput);
	process.exit(result.success ? 0 : 1);
}

function output(result: SyncResult, json: boolean) {
	if (json) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	// human-readable output
	console.log(`\n=== Sync: ${result.command} ===\n`);

	if (result.error) {
		console.log(`❌ Error: ${result.error}\n`);
	}

	if (result.pull) {
		console.log('📥 Pull:');
		if (result.pull.hasConflicts) {
			console.log(`  ⚠️  Conflicts: ${result.pull.conflicts.join(', ')}`);
		} else {
			console.log(`  ${result.pull.output || 'Already up to date'}`);
		}
	}

	if (result.reconcile) {
		const r = result.reconcile;
		console.log('\n🔄 Reconcile:');
		if (r.projectsCreated.length) console.log(`  Projects created: ${r.projectsCreated.join(', ')}`);
		if (r.featuresCreated.length) console.log(`  Features created: ${r.featuresCreated.join(', ')}`);
		if (r.featuresUpdated.length) console.log(`  Features updated: ${r.featuresUpdated.join(', ')}`);
		if (r.featuresDeletedRemote.length) console.log(`  Features deleted remote: ${r.featuresDeletedRemote.join(', ')}`);
		if (r.errors.length) console.log(`  Errors: ${r.errors.join(', ')}`);
		if (!r.projectsCreated.length && !r.featuresCreated.length && !r.featuresUpdated.length && !r.featuresDeletedRemote.length) {
			console.log('  Everything in sync');
		}
	}

	if (result.push) {
		console.log('\n📤 Push:');
		if (result.push.committed) {
			console.log(`  Committed: ${result.push.summary}`);
			console.log(`  Pushed: ${result.push.pushed ? 'yes' : 'no'}`);
		} else {
			console.log(`  ${result.push.summary}`);
		}
	}

	if (result.status) {
		const s = result.status;
		console.log('📊 Status:');
		console.log(`  Git repo: ${s.isGitRepo ? 'yes' : 'no'}`);
		console.log(`  Remote: ${s.hasRemote ? 'yes' : 'no'}`);
		console.log(`  Local changes: ${s.localChanges.length || 'none'}`);
		if (s.hasRemote) {
			console.log(`  Behind remote: ${s.behindRemote ? 'yes' : 'no'}`);
			console.log(`  Ahead of remote: ${s.aheadOfRemote ? 'yes' : 'no'}`);
		}
		if (s.dbDifferences.length) {
			console.log('  DB differences:');
			s.dbDifferences.forEach(d => console.log(`    - ${d}`));
		}
	}

	console.log('');
}

main();
