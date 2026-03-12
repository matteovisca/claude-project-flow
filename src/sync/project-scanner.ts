// scans all configured paths to discover projects and features from files

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getSettings } from '../db/database.js';
import { parseFeatureDefinition, parseProjectDefinition, type FeatureMetadata, type ProjectMetadata } from './doc-parser.js';

export interface ScannedProject {
	name: string;
	path: string;
	overview: string;
	features: ScannedFeature[];
}

export interface ScannedFeature {
	projectName: string;
	dirName: string;
	metadata: FeatureMetadata;
	featureDir: string;
}

function tryReadFile(path: string): string | null {
	try {
		return readFileSync(path, 'utf-8');
	} catch { return null; }
}

function isDir(path: string): boolean {
	try { return statSync(path).isDirectory(); } catch { return false; }
}

// scans a single project directory for features
function scanProjectDir(projectPath: string, projectName: string): ScannedFeature[] {
	const featuresDir = join(projectPath, 'features');
	if (!isDir(featuresDir)) return [];

	const features: ScannedFeature[] = [];
	try {
		for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name === 'Archive' || entry.name.startsWith('.')) continue;
			const featureDir = join(featuresDir, entry.name);
			const defFile = join(featureDir, 'feature-definition.md');
			const content = tryReadFile(defFile);
			if (!content) continue;

			const metadata = parseFeatureDefinition(content);
			// use directory name as fallback if name not parsed
			if (!metadata.name) metadata.name = entry.name;

			features.push({
				projectName,
				dirName: entry.name,
				metadata,
				featureDir,
			});
		}
	} catch { /* unreadable dir */ }
	return features;
}

// scans all configured paths and returns discovered projects with their features
export function scanAllPaths(): ScannedProject[] {
	const settings = getSettings();
	const projects: ScannedProject[] = [];
	const basePath = settings.default_projects_path;

	if (!basePath || !isDir(basePath)) return projects;

	try {
		for (const entry of readdirSync(basePath, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
			const projectPath = join(basePath, entry.name);

			// try to parse project-definition.md
			const projDef = tryReadFile(join(projectPath, 'project-definition.md'));
			const projMeta: ProjectMetadata = projDef
				? parseProjectDefinition(projDef)
				: { name: entry.name, overview: '' };
			if (!projMeta.name) projMeta.name = entry.name;

			const features = scanProjectDir(projectPath, projMeta.name);

			projects.push({
				name: projMeta.name,
				path: projectPath,
				overview: projMeta.overview,
				features,
			});
		}
	} catch { /* unreadable base path */ }

	// also scan project overrides
	for (const [projName, overridePath] of Object.entries(settings.project_overrides)) {
		if (!isDir(overridePath)) continue;
		// skip if already scanned from default path
		if (projects.some(p => p.name === projName)) continue;

		const projDef = tryReadFile(join(overridePath, 'project-definition.md'));
		const projMeta = projDef
			? parseProjectDefinition(projDef)
			: { name: projName, overview: '' };

		const features = scanProjectDir(overridePath, projMeta.name || projName);

		projects.push({
			name: projMeta.name || projName,
			path: overridePath,
			overview: projMeta.overview,
			features,
		});
	}

	return projects;
}
