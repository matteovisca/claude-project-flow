import { execSync } from 'child_process';
import { basename } from 'path';
import { getDb } from '../db/database.js';

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

export function runSessionStop(): void {
	const featureName = getFeatureName();
	if (!featureName) return;

	const projectName = getProjectName();
	const db = getDb();

	// check feature exists in DB
	const feature = db.prepare(`
		SELECT f.id, f.session_log FROM features f JOIN projects p ON f.project_id = p.id
		WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
	`).get(projectName, featureName) as any;
	if (!feature) return;

	const unsyncedChanges = hasUnsyncedChanges();

	if (unsyncedChanges) {
		console.log(`**Reminder:** modifiche non committate sulla feature \`${featureName}\`. Usa \`/claude-project-flow:session-save\` per sincronizzare.`);
	}
}
