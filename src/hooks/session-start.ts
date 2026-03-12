import { execSync } from 'child_process';
import { existsSync } from 'fs';
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

function getFeatureFromDb(projectName: string, featureName: string): any | null {
	const db = getDb();
	return db.prepare(`
		SELECT f.*, p.name as project_name
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
		ORDER BY f.version DESC LIMIT 1
	`).get(projectName, featureName) as any ?? null;
}

function getFeatureContext(feature: any): string {
	const lines: string[] = [];
	lines.push(`  Status: ${feature.status}`);
	if (feature.branch) lines.push(`  Branch: ${feature.branch}`);
	return lines.join('\n');
}

function getLastSessionContext(feature: any): string | null {
	if (!feature.session_log) return null;
	const sessions = feature.session_log.split(/^## Session:/m);
	if (sessions.length < 2) return null;

	const lastSession = sessions[sessions.length - 1];
	const openMatch = lastSession.match(/### Open items for next session\n([\s\S]*?)(?=\n###|\n## |$)/);
	if (!openMatch) return null;

	const items = openMatch[1].trim();
	if (!items) return null;

	const dateMatch = lastSession.match(/^\s*(\S+)/);
	const date = dateMatch?.[1] ?? '';
	return `**Ultima sessione** (${date}):\n${items}`;
}

function getRequirementsWarning(feature: any): string | null {
	if (!feature.requirements_status) return null;
	try {
		const status = JSON.parse(feature.requirements_status);
		if (status.status === 'incomplete') {
			const lines = [`**Warning:** Requisiti incompleti (copertura: ${status.coverage}%) — usa \`/claude-project-flow:feature-requirements\` per completarli.`];
			if (status.pending_questions?.length > 0) {
				lines.push('  Domande aperte:');
				for (const q of status.pending_questions.slice(0, 3)) {
					lines.push(`  - ${q}`);
				}
				if (status.pending_questions.length > 3) {
					lines.push(`  - ...e altre ${status.pending_questions.length - 3}`);
				}
			}
			return lines.join('\n');
		}
	} catch { /* invalid JSON */ }
	return null;
}

function getPlansStatus(feature: any): string | null {
	if (!feature.plans_status) return null;
	try {
		const data = JSON.parse(feature.plans_status);
		const activePlans = data.plans?.filter((p: any) => p.status === 'active') ?? [];
		if (activePlans.length === 0) return null;

		const lines = ['**Piani attivi:**'];
		for (const p of activePlans) {
			const progress = p.progress ? `${p.progress.done}/${p.progress.total}` : '?';
			lines.push(`  - \`${p.name}\` — ${progress} step`);
		}
		return lines.join('\n');
	} catch { return null; }
}

function getPendingDiscoveriesWarning(feature: any): string | null {
	if (!feature.pending_discoveries) return null;
	try {
		const data = JSON.parse(feature.pending_discoveries);
		const depCount = data.dependencies?.length ?? 0;
		const patCount = data.patterns?.length ?? 0;
		const total = depCount + patCount;
		if (total === 0) return null;

		const parts: string[] = [];
		if (depCount > 0) parts.push(`${depCount} dipendenze`);
		if (patCount > 0) parts.push(`${patCount} pattern`);
		return `**Scoperte pendenti:** ${parts.join(', ')} rilevate nella sessione precedente — usa \`/claude-project-flow:discover-patterns\` per rivederle.`;
	} catch { return null; }
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

	lines.push(`# [${project}] project-flow context, ${getTimestamp()}`);
	lines.push('');
	lines.push(`**Branch:** ${branch.name}`);

	if (branch.isFeature && branch.featureName) {
		const feature = getFeatureFromDb(project, branch.featureName);
		if (feature) {
			lines.push('');
			lines.push(`**Active feature:** ${branch.featureName}`);
			lines.push(getFeatureContext(feature));

			const lastSession = getLastSessionContext(feature);
			if (lastSession) { lines.push(''); lines.push(lastSession); }

			const reqWarning = getRequirementsWarning(feature);
			if (reqWarning) { lines.push(''); lines.push(reqWarning); }

			const plansStatus = getPlansStatus(feature);
			if (plansStatus) { lines.push(''); lines.push(plansStatus); }

			const discWarning = getPendingDiscoveriesWarning(feature);
			if (discWarning) { lines.push(''); lines.push(discWarning); }
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

	if (lines.length <= 3) {
		lines.push('');
		lines.push('Nessuna feature tracciata. Usa `/claude-project-flow:feature-init <nome>` per iniziare.');
	}

	console.log(lines.join('\n'));
}
