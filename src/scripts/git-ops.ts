// pre-processes git operations into structured JSON
// usage: node git-ops.cjs <command> [options]
// commands: diff, log, merge-check, branch-info

import { execSync } from 'child_process';

interface DiffResult {
	command: 'diff';
	files: DiffFile[];
	stats: { added: number; modified: number; deleted: number; renamed: number };
	summary: string;
}

interface DiffFile {
	status: 'A' | 'M' | 'D' | 'R' | 'C' | 'U';
	path: string;
	oldPath?: string;
	additions: number;
	deletions: number;
}

interface LogResult {
	command: 'log';
	commits: CommitInfo[];
	count: number;
}

interface CommitInfo {
	hash: string;
	shortHash: string;
	author: string;
	date: string;
	message: string;
	type: string | null; // conventional commit type
	scope: string | null;
	filesChanged: number;
}

interface MergeCheckResult {
	command: 'merge-check';
	currentBranch: string;
	targetBranch: string;
	canMerge: boolean;
	ahead: number;
	behind: number;
	conflicts: string[];
	hasUncommitted: boolean;
}

interface BranchInfoResult {
	command: 'branch-info';
	current: string;
	tracking: string | null;
	local: string[];
	remote: string[];
	stale: string[];
}

function git(cmd: string, cwd?: string): string {
	try {
		return execSync(`git ${cmd}`, {
			cwd: cwd ?? process.cwd(),
			encoding: 'utf-8',
			stdio: 'pipe',
			timeout: 30000,
		}).trim();
	} catch (e: any) {
		return e.stdout?.toString()?.trim() ?? '';
	}
}

function gitOrThrow(cmd: string, cwd?: string): string {
	return execSync(`git ${cmd}`, {
		cwd: cwd ?? process.cwd(),
		encoding: 'utf-8',
		stdio: 'pipe',
		timeout: 30000,
	}).trim();
}

// --- DIFF ---
function doDiff(base?: string): DiffResult {
	const baseRef = base ?? 'HEAD';
	// get file status
	const nameStatus = git(`diff --name-status ${baseRef}`);
	// get numstat
	const numstat = git(`diff --numstat ${baseRef}`);

	const numstatMap = new Map<string, { add: number; del: number }>();
	for (const line of numstat.split('\n').filter(Boolean)) {
		const [add, del, file] = line.split('\t');
		numstatMap.set(file, { add: parseInt(add) || 0, del: parseInt(del) || 0 });
	}

	const files: DiffFile[] = [];
	const stats = { added: 0, modified: 0, deleted: 0, renamed: 0 };

	for (const line of nameStatus.split('\n').filter(Boolean)) {
		const parts = line.split('\t');
		const statusChar = parts[0][0] as DiffFile['status'];
		const path = parts.length > 2 ? parts[2] : parts[1]; // renamed: old -> new
		const oldPath = parts.length > 2 ? parts[1] : undefined;
		const nums = numstatMap.get(path) ?? { add: 0, del: 0 };

		files.push({
			status: statusChar,
			path,
			oldPath,
			additions: nums.add,
			deletions: nums.del,
		});

		switch (statusChar) {
			case 'A': stats.added++; break;
			case 'M': stats.modified++; break;
			case 'D': stats.deleted++; break;
			case 'R': stats.renamed++; break;
		}
	}

	const total = files.length;
	const summary = `${total} file(s): +${stats.added} ~${stats.modified} -${stats.deleted}` +
		(stats.renamed ? ` ↔${stats.renamed}` : '');

	return { command: 'diff', files, stats, summary };
}

// --- LOG ---
function doLog(count?: number, since?: string): LogResult {
	const n = count ?? 20;
	let cmd = `log --format="%H|%h|%an|%aI|%s" -n ${n}`;
	if (since) cmd += ` --since="${since}"`;
	const raw = git(cmd);

	const conventionalRe = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)/;
	const commits: CommitInfo[] = [];

	for (const line of raw.split('\n').filter(Boolean)) {
		const [hash, shortHash, author, date, ...msgParts] = line.split('|');
		const message = msgParts.join('|');
		const match = message.match(conventionalRe);

		// get files changed count
		let filesChanged = 0;
		try {
			const stat = git(`diff-tree --no-commit-id --name-only -r ${hash}`);
			filesChanged = stat.split('\n').filter(Boolean).length;
		} catch { /* skip */ }

		commits.push({
			hash, shortHash, author, date, message,
			type: match?.[1] ?? null,
			scope: match?.[2] ?? null,
			filesChanged,
		});
	}

	return { command: 'log', commits, count: commits.length };
}

// --- MERGE-CHECK ---
function doMergeCheck(target?: string): MergeCheckResult {
	const currentBranch = gitOrThrow('rev-parse --abbrev-ref HEAD');
	const targetBranch = target ?? 'main';

	// fetch to ensure we have latest
	git('fetch --quiet');

	let ahead = 0;
	let behind = 0;
	try {
		ahead = parseInt(gitOrThrow(`rev-list ${targetBranch}..HEAD --count`));
		behind = parseInt(gitOrThrow(`rev-list HEAD..${targetBranch} --count`));
	} catch { /* no tracking */ }

	// check for uncommitted changes
	const status = git('status --porcelain');
	const hasUncommitted = status.length > 0;

	// dry-run merge to detect conflicts
	let conflicts: string[] = [];
	let canMerge = true;
	try {
		// use merge-tree to check without actually merging
		const mergeBase = gitOrThrow(`merge-base HEAD ${targetBranch}`);
		const mergeTree = git(`merge-tree ${mergeBase} HEAD ${targetBranch}`);
		// merge-tree outputs conflict markers if there are conflicts
		if (mergeTree.includes('<<<<<<<') || mergeTree.includes('changed in both')) {
			canMerge = false;
			// extract conflicting file paths
			const conflictRe = /^changed in both\n\s+base\s+\d+ \w+ [a-f0-9]+ (.+)/gm;
			let match;
			while ((match = conflictRe.exec(mergeTree)) !== null) {
				conflicts.push(match[1]);
			}
		}
	} catch { /* merge-base failed, branches don't share history */ }

	return {
		command: 'merge-check',
		currentBranch,
		targetBranch,
		canMerge,
		ahead,
		behind,
		conflicts,
		hasUncommitted,
	};
}

// --- BRANCH-INFO ---
function doBranchInfo(): BranchInfoResult {
	const current = git('rev-parse --abbrev-ref HEAD');

	let tracking: string | null = null;
	try {
		tracking = gitOrThrow('rev-parse --abbrev-ref @{upstream}');
	} catch { /* no tracking */ }

	const localRaw = git('branch --format=%(refname:short)');
	const local = localRaw.split('\n').filter(Boolean);

	const remoteRaw = git('branch -r --format=%(refname:short)');
	const remote = remoteRaw.split('\n').filter(Boolean);

	// stale: local branches whose tracking branch is gone
	const stale: string[] = [];
	for (const branch of local) {
		if (branch === current) continue;
		try {
			gitOrThrow(`config branch.${branch}.remote`);
			const remoteBranch = git(`config branch.${branch}.merge`).replace('refs/heads/', '');
			const remoteRef = `origin/${remoteBranch}`;
			if (!remote.includes(remoteRef)) stale.push(branch);
		} catch { /* no tracking, not stale */ }
	}

	return { command: 'branch-info', current, tracking, local, remote, stale };
}

// --- MAIN ---
function main() {
	const command = process.argv[2];
	const jsonOutput = process.argv.includes('--json');
	const args = process.argv.slice(3).filter(a => a !== '--json');

	let result: any;

	switch (command) {
		case 'diff':
			result = doDiff(args[0]);
			break;
		case 'log': {
			const count = args[0] ? parseInt(args[0]) : undefined;
			const since = args[1];
			result = doLog(count, since);
			break;
		}
		case 'merge-check':
			result = doMergeCheck(args[0]);
			break;
		case 'branch-info':
			result = doBranchInfo();
			break;
		default:
			result = { error: `Unknown command: ${command}. Use: diff, log, merge-check, branch-info` };
			console.error(JSON.stringify(result));
			process.exit(1);
	}

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		printHuman(result);
	}
}

function printHuman(result: any) {
	switch (result.command) {
		case 'diff': {
			const r = result as DiffResult;
			console.log(`\n📊 Diff: ${r.summary}`);
			for (const f of r.files) {
				const icon = { A: '🟢', M: '🟡', D: '🔴', R: '🔄', C: '📋', U: '⚠️' }[f.status] ?? '?';
				console.log(`  ${icon} ${f.path} (+${f.additions} -${f.deletions})`);
			}
			break;
		}
		case 'log': {
			const r = result as LogResult;
			console.log(`\n📜 Log: ${r.count} commits`);
			for (const c of r.commits) {
				const type = c.type ? `[${c.type}]` : '';
				console.log(`  ${c.shortHash} ${type} ${c.message} (${c.author}, ${c.filesChanged} files)`);
			}
			break;
		}
		case 'merge-check': {
			const r = result as MergeCheckResult;
			console.log(`\n🔀 Merge check: ${r.currentBranch} → ${r.targetBranch}`);
			console.log(`  Can merge: ${r.canMerge ? 'yes' : 'NO'}`);
			console.log(`  Ahead: ${r.ahead} | Behind: ${r.behind}`);
			console.log(`  Uncommitted: ${r.hasUncommitted ? 'yes' : 'no'}`);
			if (r.conflicts.length) console.log(`  Conflicts: ${r.conflicts.join(', ')}`);
			break;
		}
		case 'branch-info': {
			const r = result as BranchInfoResult;
			console.log(`\n🌿 Branch info`);
			console.log(`  Current: ${r.current}`);
			console.log(`  Tracking: ${r.tracking ?? 'none'}`);
			console.log(`  Local: ${r.local.join(', ')}`);
			console.log(`  Stale: ${r.stale.length ? r.stale.join(', ') : 'none'}`);
			break;
		}
	}
}

main();
