// loads all context for a feature from DB into structured JSON
// usage: node context-loader.cjs <feature-name> [--project <name>] [--json]
//        node context-loader.cjs --project <name> [--json]

import { execSync } from 'child_process';
import { basename } from 'path';
import { getDb } from '../db/database.js';

interface FeatureContext {
	featureName: string;
	projectName: string;
	status: string;
	branch: string | null;
	definition: string | null;
	sessionLog: string | null;
	requirementsStatus: any | null;
	plansStatus: any | null;
	pendingDiscoveries: any | null;
	documents: { id: number; type: string; name: string; size: number }[];
	attachments: { id: number; name: string; mime_type: string; size: number }[];
}

interface ProjectOverview {
	projectName: string;
	definition: string | null;
	overview: string | null;
	features: FeatureContext[];
}

function detectProjectName(): string {
	try {
		const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', stdio: 'pipe' }).trim();
		return basename(root);
	} catch {
		return basename(process.cwd());
	}
}

function loadFeatureContext(featureId: number): FeatureContext {
	const db = getDb();
	const feat = db.prepare(`
		SELECT f.*, p.name as project_name
		FROM features f JOIN projects p ON f.project_id = p.id
		WHERE f.id = ?
	`).get(featureId) as any;

	const documents = db.prepare(
		'SELECT id, type, name, LENGTH(content) as size FROM feature_documents WHERE feature_id = ? ORDER BY type, name'
	).all(featureId) as any[];

	const attachments = db.prepare(
		'SELECT id, name, mime_type, size FROM feature_attachments WHERE feature_id = ? ORDER BY name'
	).all(featureId) as any[];

	return {
		featureName: feat.name,
		projectName: feat.project_name,
		status: feat.status,
		branch: feat.branch,
		definition: feat.definition,
		sessionLog: feat.session_log,
		requirementsStatus: feat.requirements_status ? tryParseJson(feat.requirements_status) : null,
		plansStatus: feat.plans_status ? tryParseJson(feat.plans_status) : null,
		pendingDiscoveries: feat.pending_discoveries ? tryParseJson(feat.pending_discoveries) : null,
		documents,
		attachments,
	};
}

function loadProjectOverview(projectId: number): ProjectOverview {
	const db = getDb();
	const proj = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
	const features = db.prepare(
		'SELECT id FROM features WHERE project_id = ? AND closed_at IS NULL ORDER BY created_at DESC'
	).all(projectId) as any[];

	return {
		projectName: proj.name,
		definition: proj.definition,
		overview: proj.overview,
		features: features.map(f => loadFeatureContext(f.id)),
	};
}

function tryParseJson(s: string): any {
	try { return JSON.parse(s); } catch { return s; }
}

function main() {
	const args = process.argv.slice(2).filter(a => a !== '--json');
	const jsonOutput = process.argv.includes('--json');
	const db = getDb();

	const projectIdx = args.indexOf('--project');
	const projectName = projectIdx >= 0 ? args[projectIdx + 1] : undefined;
	const featureName = args.find(a => !a.startsWith('--') && a !== projectName);

	let result: any;

	if (featureName) {
		// load single feature
		const projName = projectName ?? detectProjectName();
		const feat = db.prepare(`
			SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
			WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
		`).get(projName, featureName) as any;
		if (!feat) { result = { error: `Feature "${featureName}" not found in "${projName}"` }; }
		else { result = loadFeatureContext(feat.id); }
	} else if (projectName) {
		// load project overview
		const proj = db.prepare('SELECT id FROM projects WHERE name = ?').get(projectName) as any;
		if (!proj) { result = { error: `Project "${projectName}" not found` }; }
		else { result = loadProjectOverview(proj.id); }
	} else {
		// all projects
		const projects = db.prepare('SELECT id FROM projects ORDER BY name').all() as any[];
		result = { projects: projects.map(p => loadProjectOverview(p.id)) };
	}

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (result.error) {
			console.log(`Error: ${result.error}`);
			process.exit(1);
		}
		if (result.projects) {
			for (const p of result.projects) printProjectSummary(p);
		} else if (result.features) {
			printProjectSummary(result);
		} else if (result.featureName) {
			printFeatureSummary(result);
		}
	}
}

function printProjectSummary(p: ProjectOverview) {
	console.log(`\n${p.projectName} (${p.features.length} features)`);
	for (const f of p.features) {
		console.log(`  - ${f.featureName} [${f.status}] docs:${f.documents.length} att:${f.attachments.length}`);
	}
}

function printFeatureSummary(f: FeatureContext) {
	console.log(`\nFeature: ${f.featureName} [${f.status}]`);
	console.log(`  Project: ${f.projectName}`);
	console.log(`  Branch: ${f.branch ?? '-'}`);
	console.log(`  Definition: ${f.definition ? 'yes' : 'no'}`);
	console.log(`  Session log: ${f.sessionLog ? 'yes' : 'no'}`);
	console.log(`  Documents: ${f.documents.length}`);
	for (const d of f.documents) {
		console.log(`    - [${d.type}] ${d.name} (${d.size} bytes)`);
	}
	console.log(`  Attachments: ${f.attachments.length}`);
}

main();
