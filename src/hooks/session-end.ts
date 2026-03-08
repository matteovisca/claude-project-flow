import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { createHash } from 'crypto';
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

function getMergeBase(): string | null {
	try {
		// try common base branches
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
	reason?: string;
	description?: string;
	files: string[];
	lines?: string;
	scope?: string;
}

interface PendingDiscoveries {
	session_date: string;
	dependencies: Discovery[];
	patterns: Discovery[];
	conventions: Discovery[];
}

// dependency file patterns for common ecosystems
const DEP_FILES = [
	'package.json', 'package-lock.json',
	'requirements.txt', 'Pipfile', 'pyproject.toml',
	'Cargo.toml', 'go.mod', 'pom.xml',
	'*.csproj', 'Gemfile'
];

function analyzeDependencyChanges(mergeBase: string | null): Discovery[] {
	const discoveries: Discovery[] = [];
	const diffRef = mergeBase ? `${mergeBase}..HEAD` : 'HEAD~5..HEAD';

	try {
		// check package.json changes (most common for this project)
		const depDiff = execSync(
			`git diff ${diffRef} -- package.json 2>/dev/null || true`,
			{ encoding: 'utf-8', maxBuffer: 1024 * 1024 }
		).trim();

		if (!depDiff) return discoveries;

		// extract added dependencies
		const addedLines = depDiff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
		const removedLines = depDiff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'));

		const depRegex = /"([^"]+)":\s*"([^"]+)"/;

		for (const line of addedLines) {
			const match = line.match(depRegex);
			if (!match) continue;
			const [, name, version] = match;
			// check if it was just a version change
			const wasRemoved = removedLines.some(r => r.includes(`"${name}"`));
			discoveries.push({
				name,
				version,
				action: wasRemoved ? 'updated' : 'added',
				files: ['package.json']
			});
		}

		for (const line of removedLines) {
			const match = line.match(depRegex);
			if (!match) continue;
			const [, name] = match;
			const wasAdded = addedLines.some(a => a.includes(`"${name}"`));
			if (!wasAdded) {
				discoveries.push({
					name,
					action: 'removed',
					files: ['package.json']
				});
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

		// get changed files (only source code)
		const files = diff.split('\n')
			.map(l => l.trim().split(/\s+/)[0])
			.filter(f => f && /\.(ts|js|py|rs|go|java|cs|rb)$/.test(f));

		if (files.length === 0) return discoveries;

		// check for new file patterns by looking at the full diff
		const fullDiff = execSync(
			`git diff ${diffRef} -- ${files.slice(0, 20).map(f => `"${f}"`).join(' ')} 2>/dev/null || true`,
			{ encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }
		).trim();

		// detect common patterns in added lines
		const addedCode = fullDiff.split('\n')
			.filter(l => l.startsWith('+') && !l.startsWith('+++'))
			.join('\n');

		// pattern: new abstract class / interface
		if (/abstract\s+class|interface\s+\w+\s*\{/.test(addedCode)) {
			discoveries.push({
				name: 'New abstraction',
				description: 'New abstract class or interface introduced',
				files: files.slice(0, 5)
			});
		}

		// pattern: factory/builder
		if (/create\w+|build\w+|factory/i.test(addedCode) && /return\s+new\s/.test(addedCode)) {
			discoveries.push({
				name: 'Factory/Builder pattern',
				description: 'Factory or builder function detected',
				files: files.slice(0, 5)
			});
		}

		// pattern: new middleware/decorator
		if (/middleware|decorator|@\w+|\.use\(/.test(addedCode)) {
			discoveries.push({
				name: 'Middleware/Decorator pattern',
				description: 'Middleware or decorator usage detected',
				files: files.slice(0, 5)
			});
		}

		// pattern: new error handling approach
		if (/class\s+\w*Error\s+extends|custom\s+error|ErrorHandler/.test(addedCode)) {
			discoveries.push({
				name: 'Custom error handling',
				description: 'New custom error class or error handler',
				files: files.slice(0, 5)
			});
		}

	} catch { /* silent */ }

	return discoveries;
}

export function runSessionEnd(): void {
	const featureName = getFeatureName();
	if (!featureName) return; // not on a feature branch

	const projectName = getProjectName();
	const settings = getSettings();
	const basePath = settings.project_overrides[projectName] ??
		(settings.default_projects_path ? join(settings.default_projects_path, projectName) : null);
	if (!basePath) return;

	const featureDir = join(basePath, 'features', featureName);
	if (!existsSync(featureDir)) return;

	const mergeBase = getMergeBase();
	const dependencies = analyzeDependencyChanges(mergeBase);
	const patterns = analyzePatterns(mergeBase);

	// skip if nothing found
	if (dependencies.length === 0 && patterns.length === 0) return;

	const contextDir = join(featureDir, 'context');
	if (!existsSync(contextDir)) {
		mkdirSync(contextDir, { recursive: true });
	}

	const pending: PendingDiscoveries = {
		session_date: new Date().toISOString(),
		dependencies,
		patterns,
		conventions: []
	};

	const pendingPath = join(contextDir, '.pending-discoveries.json');
	writeFileSync(pendingPath, JSON.stringify(pending, null, '\t') + '\n');
}
