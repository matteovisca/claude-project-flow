import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { getSettings } from '../db/database.js';

function getFeatureName(): string | null {
	try {
		const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
		const match = branch.match(/^feature\/(.+)$/);
		return match?.[1] ?? null;
	} catch {
		return null;
	}
}

function getProjectName(): string {
	try {
		const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
		return basename(root);
	} catch {
		return basename(process.cwd());
	}
}

function hasUnsyncedChanges(): boolean {
	try {
		const status = execSync('git status --short', { encoding: 'utf-8' }).trim();
		return status.length > 0;
	} catch {
		return false;
	}
}

function hasNewCommitsSinceLastSync(featureDir: string): boolean {
	const logPath = join(featureDir, 'context', 'session-log.md');
	if (!existsSync(logPath)) return true; // never synced

	try {
		const content = readFileSync(logPath, 'utf-8');
		// find the last recorded commit hash
		const hashMatches = [...content.matchAll(/`([a-f0-9]{7,})`/g)];
		if (hashMatches.length === 0) return true;

		const lastHash = hashMatches[hashMatches.length - 1][1];
		// check if there are commits after the last recorded one
		const newCommits = execSync(`git log ${lastHash}..HEAD --oneline 2>/dev/null`, { encoding: 'utf-8' }).trim();
		return newCommits.length > 0;
	} catch {
		return true;
	}
}

export function runSessionStop(): void {
	const featureName = getFeatureName();
	if (!featureName) return;

	const projectName = getProjectName();
	const settings = getSettings();
	const basePath = settings.project_overrides[projectName] ??
		(settings.default_projects_path ? join(settings.default_projects_path, projectName) : null);
	if (!basePath) return;

	const featureDir = join(basePath, 'features', featureName);
	if (!existsSync(featureDir)) return;

	const unsyncedChanges = hasUnsyncedChanges();
	const newCommits = hasNewCommitsSinceLastSync(featureDir);

	if (unsyncedChanges || newCommits) {
		const reasons: string[] = [];
		if (unsyncedChanges) reasons.push('modifiche non committate');
		if (newCommits) reasons.push('commit non sincronizzati');
		console.log(`**Reminder:** ${reasons.join(' e ')} sulla feature \`${featureName}\`. Usa \`/claude-project-flow:session-save\` per sincronizzare.`);
	}
}
