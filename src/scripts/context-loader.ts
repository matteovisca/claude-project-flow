// loads all context files for a feature into a single structured JSON
// usage: node context-loader.cjs <feature-dir> [--json]
//        node context-loader.cjs --project <project-name> [--json]

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { getDb, getSettings } from '../db/database.js';

interface FeatureContext {
	featureName: string;
	featureDir: string;
	definition: string | null;
	requirements: string | null;
	requirementsStatus: any | null;
	plans: PlanInfo[];
	plansStatus: any | null;
	sessionLog: string | null;
	discoveries: any | null;
	contextFiles: Record<string, string>;
	dbRecord: any | null;
}

interface PlanInfo {
	name: string;
	content: string;
}

interface ProjectOverview {
	projectName: string;
	projectDir: string;
	definition: string | null;
	features: FeatureContext[];
	dbRecord: any | null;
}

function tryReadFile(path: string): string | null {
	try { return readFileSync(path, 'utf-8'); } catch { return null; }
}

function tryReadJson(path: string): any | null {
	try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function isDir(path: string): boolean {
	try { return statSync(path).isDirectory(); } catch { return false; }
}

function loadFeatureContext(featureDir: string, featureName: string): FeatureContext {
	const ctx: FeatureContext = {
		featureName,
		featureDir,
		definition: tryReadFile(join(featureDir, 'feature-definition.md')),
		requirements: tryReadFile(join(featureDir, 'requirements', 'requirements.md')),
		requirementsStatus: tryReadJson(join(featureDir, 'context', '.requirements-status.json')),
		plans: [],
		plansStatus: tryReadJson(join(featureDir, 'context', '.plans-status.json')),
		sessionLog: tryReadFile(join(featureDir, 'context', 'session-log.md')),
		discoveries: tryReadJson(join(featureDir, 'context', '.pending-discoveries.json')),
		contextFiles: {},
		dbRecord: null,
	};

	// load all plans
	const plansDir = join(featureDir, 'plans');
	if (isDir(plansDir)) {
		try {
			for (const entry of readdirSync(plansDir)) {
				if (extname(entry) === '.md') {
					const content = tryReadFile(join(plansDir, entry));
					if (content) {
						ctx.plans.push({ name: basename(entry, '.md'), content });
					}
				}
			}
		} catch { /* skip */ }
	}

	// load extra context files (non-hidden, non-json)
	const contextDir = join(featureDir, 'context');
	if (isDir(contextDir)) {
		try {
			for (const entry of readdirSync(contextDir)) {
				if (entry.startsWith('.') || entry === 'session-log.md') continue;
				if (extname(entry) === '.md') {
					const content = tryReadFile(join(contextDir, entry));
					if (content) ctx.contextFiles[entry] = content;
				}
			}
		} catch { /* skip */ }
	}

	// load DB record
	try {
		const db = getDb();
		const parts = featureDir.split('/');
		const featIdx = parts.indexOf('features');
		const projDir = parts.slice(0, featIdx).pop() ?? '';
		const projRow = db.prepare('SELECT id FROM projects WHERE name = ?').get(projDir) as any;
		if (projRow) {
			ctx.dbRecord = db.prepare(
				'SELECT * FROM features WHERE project_id = ? AND name = ? ORDER BY version DESC LIMIT 1'
			).get(projRow.id, featureName);
		}
	} catch { /* no DB access */ }

	return ctx;
}

function loadProjectOverview(projectDir: string, projectName: string): ProjectOverview {
	const overview: ProjectOverview = {
		projectName,
		projectDir,
		definition: tryReadFile(join(projectDir, 'project-definition.md')),
		features: [],
		dbRecord: null,
	};

	// load all features
	const featuresDir = join(projectDir, 'features');
	if (isDir(featuresDir)) {
		try {
			for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
				if (!entry.isDirectory() || entry.name === 'Archive' || entry.name.startsWith('.')) continue;
				overview.features.push(loadFeatureContext(join(featuresDir, entry.name), entry.name));
			}
		} catch { /* skip */ }
	}

	// load DB record
	try {
		const db = getDb();
		overview.dbRecord = db.prepare('SELECT * FROM projects WHERE name = ?').get(projectName);
	} catch { /* no DB access */ }

	return overview;
}

function resolveFeatureDir(featureName: string): string | null {
	const settings = getSettings();
	const base = settings.default_projects_path;
	if (!base) return null;

	// search across all projects
	try {
		for (const projEntry of readdirSync(base, { withFileTypes: true })) {
			if (!projEntry.isDirectory()) continue;
			const featureDir = join(base, projEntry.name, 'features', featureName);
			if (isDir(featureDir)) return featureDir;
		}
	} catch { /* skip */ }

	return null;
}

// --- MAIN ---
function main() {
	const args = process.argv.slice(2).filter(a => a !== '--json');
	const jsonOutput = process.argv.includes('--json');
	const projectFlag = args.indexOf('--project');

	let result: any;

	if (projectFlag >= 0 && args[projectFlag + 1]) {
		// load entire project
		const projectName = args[projectFlag + 1];
		const settings = getSettings();
		const projectDir = settings.project_overrides[projectName]
			?? join(settings.default_projects_path, projectName);

		if (!isDir(projectDir)) {
			result = { error: `Project directory not found: ${projectDir}` };
		} else {
			result = loadProjectOverview(projectDir, projectName);
		}
	} else if (args[0]) {
		// direct feature dir or feature name
		const input = args[0];
		if (isDir(input) && existsSync(join(input, 'feature-definition.md'))) {
			// direct path
			const name = basename(input);
			result = loadFeatureContext(input, name);
		} else {
			// treat as feature name, search
			const dir = resolveFeatureDir(input);
			if (dir) {
				result = loadFeatureContext(dir, input);
			} else {
				result = { error: `Feature "${input}" not found in any project` };
			}
		}
	} else {
		// load all projects
		const settings = getSettings();
		const base = settings.default_projects_path;
		if (!base || !isDir(base)) {
			result = { error: `Projects path not configured or doesn't exist: ${base}` };
		} else {
			const projects: ProjectOverview[] = [];
			for (const entry of readdirSync(base, { withFileTypes: true })) {
				if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
				projects.push(loadProjectOverview(join(base, entry.name), entry.name));
			}
			result = { projects };
		}
	}

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		// human-readable summary
		if (result.error) {
			console.log(`❌ ${result.error}`);
			process.exit(1);
		}

		if (result.projects) {
			// all projects
			for (const p of result.projects) {
				printProjectSummary(p);
			}
		} else if (result.features) {
			// single project
			printProjectSummary(result);
		} else if (result.featureName) {
			// single feature
			printFeatureSummary(result);
		}
	}
}

function printProjectSummary(p: ProjectOverview) {
	console.log(`\n📁 ${p.projectName} (${p.features.length} features)`);
	for (const f of p.features) {
		const status = f.dbRecord?.status ?? '?';
		const reqCoverage = f.requirementsStatus?.coverage ?? '-';
		const planProgress = f.plansStatus?.plans
			?.map((pl: any) => `${pl.name}: ${pl.progress?.done ?? '?'}/${pl.progress?.total ?? '?'}`)
			.join(', ') ?? '-';
		console.log(`  ├─ ${f.featureName} [${status}] req:${reqCoverage}% plans:${planProgress}`);
	}
}

function printFeatureSummary(f: FeatureContext) {
	console.log(`\n📋 Feature: ${f.featureName}`);
	console.log(`  Status: ${f.dbRecord?.status ?? '?'}`);
	console.log(`  Definition: ${f.definition ? 'yes' : 'no'}`);
	console.log(`  Requirements: ${f.requirements ? 'yes' : 'no'} (${f.requirementsStatus?.coverage ?? '-'}%)`);
	console.log(`  Plans: ${f.plans.length}`);
	if (f.plansStatus?.plans) {
		for (const pl of f.plansStatus.plans) {
			console.log(`    - ${pl.name} [${pl.status}] ${pl.progress.done}/${pl.progress.total}`);
		}
	}
	console.log(`  Session log: ${f.sessionLog ? 'yes' : 'no'}`);
	console.log(`  Discoveries: ${f.discoveries ? 'yes' : 'no'}`);
	console.log(`  Context files: ${Object.keys(f.contextFiles).length}`);
}

main();
