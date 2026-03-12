// run git log/diff/status on a registered project's source path
// usage: node project-git.cjs <project-name> <log|diff|status> [--json]

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getDb } from '../db/database.js';

function isGitRepo(dir: string): boolean {
	try {
		execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'pipe', timeout: 5000 });
		return true;
	} catch { return false; }
}

function git(cmd: string, cwd: string): string {
	return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', stdio: 'pipe', timeout: 30000 }).trim();
}

function main() {
	const args = process.argv.slice(2).filter(a => a !== '--json');
	const jsonMode = process.argv.includes('--json');
	const [projectName, cmd] = args;

	if (!projectName || !cmd) {
		const msg = 'Usage: project-git <project-name> <log|diff|status> [--json]';
		if (jsonMode) console.log(JSON.stringify({ error: msg }));
		else console.error(msg);
		process.exit(1);
	}

	if (!['log', 'diff', 'status'].includes(cmd)) {
		const msg = `Unknown command: ${cmd}. Use: log, diff, status`;
		if (jsonMode) console.log(JSON.stringify({ error: msg }));
		else console.error(msg);
		process.exit(1);
	}

	const db = getDb();
	const row = db.prepare('SELECT * FROM projects WHERE name = ?').get(projectName) as any;
	if (!row) {
		const msg = `Project not found: ${projectName}`;
		if (jsonMode) console.log(JSON.stringify({ error: msg }));
		else console.error(msg);
		process.exit(1);
	}

	const dir = row.path;
	if (!existsSync(dir)) {
		const msg = `Path does not exist: ${dir}`;
		if (jsonMode) console.log(JSON.stringify({ error: msg }));
		else console.error(msg);
		process.exit(1);
	}

	if (!isGitRepo(dir)) {
		const msg = `Not a git repository: ${dir}`;
		if (jsonMode) console.log(JSON.stringify({ error: msg }));
		else console.error(msg);
		process.exit(1);
	}

	try {
		const branch = git('rev-parse --abbrev-ref HEAD', dir);
		let output = '';

		switch (cmd) {
			case 'log':
				output = git('log --oneline --graph --decorate -n 30', dir);
				break;
			case 'diff':
				output = git('diff', dir);
				if (!output) output = git('diff --staged', dir) || '(no changes)';
				break;
			case 'status':
				output = git('status', dir);
				break;
		}

		if (jsonMode) {
			console.log(JSON.stringify({ output, branch, cmd, path: dir }));
		} else {
			console.log(`\n${projectName} — branch: ${branch}`);
			console.log(`${dir}\n`);
			console.log(output);
		}
	} catch (err: any) {
		if (jsonMode) console.log(JSON.stringify({ error: err.message }));
		else console.error(`Error: ${err.message}`);
		process.exit(1);
	}
}

main();
