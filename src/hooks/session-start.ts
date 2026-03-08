import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { getDb } from '../db/database.js';

interface BranchInfo {
	name: string;
	isFeature: boolean;
	featureName: string | null;
}

function getTimestamp(): string {
	const now = new Date();
	const date = now.toLocaleDateString('en-CA');
	const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return `${date} ${time} ${tz}`;
}

function getCurrentBranch(): BranchInfo {
	try {
		const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
		const featureMatch = branch.match(/^feature\/(.+)$/);
		return {
			name: branch,
			isFeature: !!featureMatch,
			featureName: featureMatch?.[1] ?? null
		};
	} catch {
		return { name: 'unknown', isFeature: false, featureName: null };
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

function getFeatureContext(projectName: string, featureName: string): string | null {
	const db = getDb();

	const feature = db.prepare(`
		SELECT f.*, p.name as project_name
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
		ORDER BY f.version DESC LIMIT 1
	`).get(projectName, featureName) as any;

	if (!feature) return null;

	const lines: string[] = [];
	lines.push(`  Status: ${feature.status}`);
	if (feature.branch) lines.push(`  Branch: ${feature.branch}`);

	if (feature.progress_path && existsSync(feature.progress_path)) {
		const content = readFileSync(feature.progress_path, 'utf-8');
		const statusMatch = content.match(/## Status:\s*(.+)/);
		if (statusMatch) lines.push(`  Progress: ${statusMatch[1].trim()}`);
	}

	return lines.join('\n');
}

function getActiveFeatures(projectName: string): string[] {
	const db = getDb();
	const rows = db.prepare(`
		SELECT f.name, f.status, f.branch
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE p.name = ? AND f.closed_at IS NULL
		ORDER BY f.created_at DESC LIMIT 5
	`).all(projectName) as any[];

	return rows.map(r => `  - ${r.name} [${r.status}]${r.branch ? ` (${r.branch})` : ''}`);
}

export function runSessionStart(): void {
	const project = getProjectName();
	const branch = getCurrentBranch();
	const lines: string[] = [];

	// header — same pattern as claude-mem for banner display
	lines.push(`# [${project}] project-flow context, ${getTimestamp()}`);
	lines.push('');
	lines.push(`**Branch:** ${branch.name}`);

	if (branch.isFeature && branch.featureName) {
		const ctx = getFeatureContext(project, branch.featureName);
		if (ctx) {
			lines.push('');
			lines.push(`**Active feature:** ${branch.featureName}`);
			lines.push(ctx);
		} else {
			lines.push('');
			lines.push(`Feature branch \`${branch.featureName}\` non tracciata — usa \`/claude-project-flow:feature-init ${branch.featureName}\` per registrarla`);
		}
	}

	const active = getActiveFeatures(project);
	if (active.length > 0) {
		lines.push('');
		lines.push('**Feature attive:**');
		lines.push(...active);
	}

	const featuresDir = join(process.cwd(), '.claude', 'features');
	if (existsSync(featuresDir)) {
		lines.push('');
		lines.push('Feature docs: `.claude/features/`');
	}

	// ensure some minimum content so the banner is displayed
	if (lines.length <= 3) {
		lines.push('');
		lines.push('Nessuna feature tracciata. Usa `/claude-project-flow:feature-init <nome>` per iniziare.');
	}

	console.log(lines.join('\n'));
}
