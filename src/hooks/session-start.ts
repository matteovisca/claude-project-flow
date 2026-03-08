import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import { getDb, getSettings } from '../db/database.js';

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

function resolveFeatureDir(projectName: string, featureName: string): string | null {
	try {
		const settings = getSettings();
		const basePath = settings.project_overrides[projectName] ?? (
			settings.default_projects_path ? join(settings.default_projects_path, projectName) : null
		);
		if (!basePath) return null;
		return join(basePath, 'features', featureName);
	} catch {
		return null;
	}
}

function getRequirementsWarning(projectName: string, featureName: string): string | null {
	const featureDir = resolveFeatureDir(projectName, featureName);
	if (!featureDir) return null;

	const statusPath = join(featureDir, 'context', '.requirements-status.json');
	if (!existsSync(statusPath)) {
		return '**Warning:** Requisiti non ancora definiti — usa `/claude-project-flow:feature-requirements` per iniziare la raccolta.';
	}

	try {
		const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
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
	} catch {
		return null;
	}

	return null;
}

function getLastSessionContext(projectName: string, featureName: string): string | null {
	const featureDir = resolveFeatureDir(projectName, featureName);
	if (!featureDir) return null;

	const logPath = join(featureDir, 'context', 'session-log.md');
	if (!existsSync(logPath)) return null;

	try {
		const content = readFileSync(logPath, 'utf-8');
		// extract the last session block (last ## Session: ...)
		const sessions = content.split(/^## Session:/m);
		if (sessions.length < 2) return null;

		const lastSession = sessions[sessions.length - 1];
		// extract open items
		const openMatch = lastSession.match(/### Open items for next session\n([\s\S]*?)(?=\n###|\n## |$)/);
		if (!openMatch) return null;

		const items = openMatch[1].trim();
		if (!items) return null;

		const dateMatch = lastSession.match(/^\s*(\S+)/);
		const date = dateMatch?.[1] ?? '';

		return `**Ultima sessione** (${date}):\n${items}`;
	} catch {
		return null;
	}
}

function getPlansStatus(projectName: string, featureName: string): string | null {
	const featureDir = resolveFeatureDir(projectName, featureName);
	if (!featureDir) return null;

	const statusPath = join(featureDir, 'context', '.plans-status.json');
	if (!existsSync(statusPath)) return null;

	try {
		const data = JSON.parse(readFileSync(statusPath, 'utf-8'));
		const activePlans = data.plans?.filter((p: any) => p.status === 'active') ?? [];
		if (activePlans.length === 0) return null;

		const lines = ['**Piani attivi:**'];
		for (const p of activePlans) {
			const progress = p.progress ? `${p.progress.done}/${p.progress.total}` : '?';
			lines.push(`  - \`${p.name}\` — ${progress} step`);
		}
		return lines.join('\n');
	} catch {
		return null;
	}
}

function getPendingDiscoveriesWarning(projectName: string, featureName: string): string | null {
	const featureDir = resolveFeatureDir(projectName, featureName);
	if (!featureDir) return null;

	const pendingPath = join(featureDir, 'context', '.pending-discoveries.json');
	if (!existsSync(pendingPath)) return null;

	try {
		const data = JSON.parse(readFileSync(pendingPath, 'utf-8'));
		const depCount = data.dependencies?.length ?? 0;
		const patCount = data.patterns?.length ?? 0;
		const total = depCount + patCount;
		if (total === 0) return null;

		const parts: string[] = [];
		if (depCount > 0) parts.push(`${depCount} dipendenze`);
		if (patCount > 0) parts.push(`${patCount} pattern`);

		return `**Scoperte pendenti:** ${parts.join(', ')} rilevate nella sessione precedente — usa \`/claude-project-flow:discover-patterns\` per rivederle.`;
	} catch {
		return null;
	}
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

			// show last session context
			const lastSession = getLastSessionContext(project, branch.featureName);
			if (lastSession) {
				lines.push('');
				lines.push(lastSession);
			}

			// check requirements status
			const reqWarning = getRequirementsWarning(project, branch.featureName);
			if (reqWarning) {
				lines.push('');
				lines.push(reqWarning);
			}

			// show active plans progress
			const plansStatus = getPlansStatus(project, branch.featureName);
			if (plansStatus) {
				lines.push('');
				lines.push(plansStatus);
			}

			// check pending discoveries
			const discWarning = getPendingDiscoveriesWarning(project, branch.featureName);
			if (discWarning) {
				lines.push('');
				lines.push(discWarning);
			}
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
