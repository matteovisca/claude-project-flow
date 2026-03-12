// reconciles file state with DB state — files are the source of truth

import { getDb } from '../db/database.js';
import { scanAllPaths, type ScannedProject, type ScannedFeature } from './project-scanner.js';

export interface ReconcileResult {
	projectsCreated: string[];
	projectsUnchanged: string[];
	featuresCreated: string[];
	featuresUpdated: string[];
	featuresDeletedRemote: string[];
	errors: string[];
}

export function reconcile(): ReconcileResult {
	const db = getDb();
	const scanned = scanAllPaths();

	const result: ReconcileResult = {
		projectsCreated: [],
		projectsUnchanged: [],
		featuresCreated: [],
		featuresUpdated: [],
		featuresDeletedRemote: [],
		errors: [],
	};

	// build set of all feature keys found in files
	const fileFeatureKeys = new Set<string>();

	for (const project of scanned) {
		// ensure project exists in DB
		const existingProject = db.prepare('SELECT id FROM projects WHERE name = ?').get(project.name) as any;
		let projectId: number;

		if (!existingProject) {
			try {
				const res = db.prepare(
					'INSERT INTO projects (name, path, type) VALUES (?, ?, ?)'
				).run(project.name, project.path, 'app');
				projectId = res.lastInsertRowid as number;
				result.projectsCreated.push(project.name);
			} catch (e: any) {
				result.errors.push(`Project "${project.name}": ${e.message}`);
				continue;
			}
		} else {
			projectId = existingProject.id;
			result.projectsUnchanged.push(project.name);
		}

		// reconcile features
		for (const feature of project.features) {
			const key = `${project.name}/${feature.metadata.name}`;
			fileFeatureKeys.add(key);

			try {
				reconcileFeature(db, projectId, feature, result);
			} catch (e: any) {
				result.errors.push(`Feature "${key}": ${e.message}`);
			}
		}

		// detect features deleted from remote (EC-3)
		const dbFeatures = db.prepare(
			"SELECT id, name, status FROM features WHERE project_id = ? AND closed_at IS NULL AND status != 'deleted-remote'"
		).all(projectId) as { id: number; name: string; status: string }[];

		for (const dbFeat of dbFeatures) {
			const key = `${project.name}/${dbFeat.name}`;
			if (!fileFeatureKeys.has(key)) {
				db.prepare("UPDATE features SET status = 'deleted-remote' WHERE id = ?").run(dbFeat.id);
				result.featuresDeletedRemote.push(key);
			}
		}
	}

	return result;
}

function reconcileFeature(
	db: any,
	projectId: number,
	feature: ScannedFeature,
	result: ReconcileResult,
): void {
	const { metadata } = feature;
	const existing = db.prepare(
		'SELECT id, status, branch, author, last_modified_by FROM features WHERE project_id = ? AND name = ? AND closed_at IS NULL'
	).get(projectId, metadata.name) as any;

	if (!existing) {
		// create new feature from file
		db.prepare(
			'INSERT INTO features (project_id, name, branch, status, author, last_modified_by) VALUES (?, ?, ?, ?, ?, ?)'
		).run(
			projectId,
			metadata.name,
			metadata.branch,
			metadata.status,
			metadata.author,
			metadata.lastModifiedBy,
		);
		result.featuresCreated.push(`${feature.projectName}/${metadata.name}`);
	} else {
		// update from file — file is source of truth
		const updates: string[] = [];
		const params: any[] = [];

		if (metadata.status && metadata.status !== existing.status) {
			updates.push('status = ?');
			params.push(metadata.status);
		}
		if (metadata.branch && metadata.branch !== existing.branch) {
			updates.push('branch = ?');
			params.push(metadata.branch);
		}
		if (metadata.lastModifiedBy && metadata.lastModifiedBy !== existing.last_modified_by) {
			updates.push('last_modified_by = ?');
			params.push(metadata.lastModifiedBy);
		}
		// author only if not set yet (preserve original)
		if (metadata.author && !existing.author) {
			updates.push('author = ?');
			params.push(metadata.author);
		}

		if (updates.length > 0) {
			params.push(existing.id);
			db.prepare(`UPDATE features SET ${updates.join(', ')} WHERE id = ?`).run(...params);
			result.featuresUpdated.push(`${feature.projectName}/${metadata.name}`);
		}
	}
}
