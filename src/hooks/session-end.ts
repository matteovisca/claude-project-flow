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

function getMergeBase(): string | null {
	try {
		for (const base of ['main', 'master', 'develop']) {
			try {
				return execSync(`git merge-base ${base} HEAD`, { encoding: 'utf-8' }).trim();
			} catch { /* try next */ }
		}
		return null;
	} catch {
		return null;
	}
}

interface Discovery {
	name: string;
	version?: string;
	action?: string;
	description?: string;
	files: string[];
}

interface PendingDiscoveries {
	session_date: string;
	dependencies: Discovery[];
	patterns: Discovery[];
	conventions: Discovery[];
}

function analyzeDependencyChanges(mergeBase: string | null): Discovery[] {
	const discoveries: Discovery[] = [];
	const diffRef = mergeBase ? `${mergeBase}..HEAD` : 'HEAD~5..HEAD';

	try {
		const depDiff = execSync(
			`git diff ${diffRef} -- package.json 2>/dev/null || true`,
			{ encoding: 'utf-8', maxBuffer: 1024 * 1024 }
		).trim();

		if (!depDiff) return discoveries;

		const addedLines = depDiff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
		const removedLines = depDiff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));
		const depRegex = /"([^"]+)":\s*"([^"]+)"/;

		for (const line of addedLines) {
			const match = line.match(depRegex);
			if (!match) continue;
			const [, name, version] = match;
			const wasRemoved = removedLines.some(r => r.includes(`"${name}"`));
			discoveries.push({ name, version, action: wasRemoved ? 'updated' : 'added', files: ['package.json'] });
		}

		for (const line of removedLines) {
			const match = line.match(depRegex);
			if (!match) continue;
			const [, name] = match;
			const wasAdded = addedLines.some(a => a.includes(`"${name}"`));
			if (!wasAdded) {
				discoveries.push({ name, action: 'removed', files: ['package.json'] });
			}
		}
	} catch { /* silent */ }

	return discoveries;
}

function analyzePatterns(mergeBase: string | null): Discovery[] {
	const discoveries: Discovery[] = [];
	const diffRef = mergeBase ? `${mergeBase}..HEAD` : 'HEAD~5..HEAD';

	try {
		const diff = execSync(
			`git diff ${diffRef} --stat 2>/dev/null || true`,
			{ encoding: 'utf-8', maxBuffer: 1024 * 1024 }
		).trim();

		if (!diff) return discoveries;

		const files = diff.split('\n')
			.map(l => l.trim().split(/\s+/)[0])
			.filter(f => f && /\.(ts|js|py|rs|go|java|cs|rb)$/.test(f));

		if (files.length === 0) return discoveries;

		const fullDiff = execSync(
			`git diff ${diffRef} -- ${files.slice(0, 20).map(f => `"${f}"`).join(' ')} 2>/dev/null || true`,
			{ encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }
		).trim();

		const addedCode = fullDiff.split('\n')
			.filter(l => l.startsWith('+') && !l.startsWith('+++'))
			.join('\n');

		if (/abstract\s+class|interface\s+\w+\s*\{/.test(addedCode)) {
			discoveries.push({ name: 'New abstraction', description: 'New abstract class or interface introduced', files: files.slice(0, 5) });
		}
		if (/create\w+|build\w+|factory/i.test(addedCode) && /return\s+new\s/.test(addedCode)) {
			discoveries.push({ name: 'Factory/Builder pattern', description: 'Factory or builder function detected', files: files.slice(0, 5) });
		}
		if (/middleware|decorator|@\w+|\.use\(/.test(addedCode)) {
			discoveries.push({ name: 'Middleware/Decorator pattern', description: 'Middleware or decorator usage detected', files: files.slice(0, 5) });
		}
		if (/class\s+\w*Error\s+extends|custom\s+error|ErrorHandler/.test(addedCode)) {
			discoveries.push({ name: 'Custom error handling', description: 'New custom error class or error handler', files: files.slice(0, 5) });
		}
	} catch { /* silent */ }

	return discoveries;
}

export function runSessionEnd(): void {
	const featureName = getFeatureName();
	if (!featureName) return;

	const projectName = getProjectName();
	const db = getDb();

	// find feature in DB
	const feature = db.prepare(`
		SELECT f.id FROM features f JOIN projects p ON f.project_id = p.id
		WHERE p.name = ? AND f.name = ? AND f.closed_at IS NULL
	`).get(projectName, featureName) as any;
	if (!feature) return;

	const mergeBase = getMergeBase();
	const dependencies = analyzeDependencyChanges(mergeBase);
	const patterns = analyzePatterns(mergeBase);

	if (dependencies.length === 0 && patterns.length === 0) return;

	const pending: PendingDiscoveries = {
		session_date: new Date().toISOString(),
		dependencies,
		patterns,
		conventions: []
	};

	// save to DB instead of filesystem
	db.prepare("UPDATE features SET pending_discoveries = ? WHERE id = ?")
		.run(JSON.stringify(pending, null, '\t'), feature.id);
}
