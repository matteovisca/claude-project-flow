import { build } from 'esbuild';
import { readFileSync, writeFileSync, cpSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

console.log(`Building claude-project-flow v${pkg.version}...`);

// Build MCP service
await build({
	entryPoints: [resolve(root, 'src/server/mcp-server.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/service.cjs'),
	minify: true,
	logLevel: 'error',
	external: ['better-sqlite3'],
	define: {
		'__VERSION__': JSON.stringify(pkg.version)
	},
	banner: {
		js: '#!/usr/bin/env node'
	}
});

console.log('  [ok] service.cjs built');

// Build context-loader CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/context-loader.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/context-loader.cjs'),
	minify: true,
	logLevel: 'error',
	external: ['better-sqlite3'],
});

console.log('  [ok] context-loader.cjs built');

// Build git-ops CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/git-ops.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/git-ops.cjs'),
	minify: true,
	logLevel: 'error',
});

console.log('  [ok] git-ops.cjs built');

// Build feature-scaffold CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/feature-scaffold.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/feature-scaffold.cjs'),
	minify: true,
	logLevel: 'error',
	external: ['better-sqlite3'],
});

console.log('  [ok] feature-scaffold.cjs built');

// Build man CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/man.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/man.cjs'),
	minify: true,
	logLevel: 'error',
});

console.log('  [ok] man.cjs built');

// Build setup-permissions CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/setup-permissions.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/setup-permissions.cjs'),
	minify: true,
	logLevel: 'error',
});

console.log('  [ok] setup-permissions.cjs built');

// Build project-git CLI
await build({
	entryPoints: [resolve(root, 'src/scripts/project-git.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/project-git.cjs'),
	minify: true,
	logLevel: 'error',
	external: ['better-sqlite3'],
});

console.log('  [ok] project-git.cjs built');

// Build dashboard server
await build({
	entryPoints: [resolve(root, 'src/dashboard/server/start.ts')],
	bundle: true,
	platform: 'node',
	target: 'node18',
	format: 'cjs',
	outfile: resolve(root, 'plugin/scripts/dist/dashboard-server.cjs'),
	minify: true,
	logLevel: 'error',
	external: ['better-sqlite3'],
	define: {
		'__VERSION__': JSON.stringify(pkg.version)
	},
	banner: {
		js: '#!/usr/bin/env node'
	}
});

console.log('  [ok] dashboard-server.cjs built');

// Build dashboard client (React → self-contained HTML)
const { execSync } = await import('child_process');
execSync('node scripts/build-client.js', { cwd: root, stdio: 'inherit' });

// Sync version in all manifests
const version = pkg.version;

const pluginJson = resolve(root, 'plugin/.claude-plugin/plugin.json');
const manifest = JSON.parse(readFileSync(pluginJson, 'utf-8'));
manifest.version = version;
writeFileSync(pluginJson, JSON.stringify(manifest, null, '\t') + '\n');

const marketplaceJson = resolve(root, '.claude-plugin/marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplaceJson, 'utf-8'));
marketplace.plugins[0].version = version;
writeFileSync(marketplaceJson, JSON.stringify(marketplace, null, '\t') + '\n');

const rootPluginJson = resolve(root, '.claude-plugin/plugin.json');
const rootManifest = JSON.parse(readFileSync(rootPluginJson, 'utf-8'));
rootManifest.version = version;
writeFileSync(rootPluginJson, JSON.stringify(rootManifest, null, '\t') + '\n');

console.log(`  [ok] version synced to ${version}`);

// Generate plugin/package.json for runtime dependencies
const pluginPkg = {
	name: 'claude-project-flow-plugin',
	version: version,
	private: true,
	description: 'Runtime dependencies for claude-project-flow plugin',
	type: 'module',
	dependencies: {
		'better-sqlite3': pkg.dependencies['better-sqlite3'],
	},
	engines: {
		node: '>=18.0.0'
	}
};
writeFileSync(resolve(root, 'plugin/package.json'), JSON.stringify(pluginPkg, null, '\t') + '\n');
console.log('  [ok] plugin/package.json generated');

// Sync skills and hooks into plugin/
cpSync(resolve(root, 'skills'), resolve(root, 'plugin/skills'), { recursive: true });
cpSync(resolve(root, 'hooks/hooks.json'), resolve(root, 'plugin/hooks/hooks.json'));
console.log('  [ok] skills and hooks synced');

// Verify distribution files
const requiredFiles = [
	'plugin/.claude-plugin/plugin.json',
	'plugin/.claude-plugin/CLAUDE.md',
	'plugin/.mcp.json',
	'plugin/CLAUDE.md',
	'plugin/package.json',
	'plugin/hooks/hooks.json',
	'plugin/scripts/dist/service.cjs',
	'plugin/scripts/dist/context-loader.cjs',
	'plugin/scripts/dist/git-ops.cjs',
	'plugin/scripts/dist/feature-scaffold.cjs',
	'plugin/scripts/dist/man.cjs',
	'plugin/scripts/dist/setup-permissions.cjs',
	'plugin/scripts/dist/project-git.cjs',
	'plugin/scripts/dist/dashboard-server.cjs',
	'plugin/scripts/dist/dashboard-ui.html',
	'plugin/scripts/smart-install.js',
];
for (const filePath of requiredFiles) {
	if (!existsSync(resolve(root, filePath))) {
		throw new Error(`Missing required distribution file: ${filePath}`);
	}
}
console.log('  [ok] all distribution files verified');

// Auto-deploy to local plugin cache if installed
const pluginManifest = JSON.parse(readFileSync(resolve(root, 'plugin/.claude-plugin/plugin.json'), 'utf-8'));
const pluginName = pluginManifest.name ?? 'claude-project-flow';
const cacheBase = join(homedir(), '.claude', 'plugins', 'cache');

// search for installed versions of this plugin across all marketplaces
let deployed = false;
if (existsSync(cacheBase)) {
	for (const marketplace of readdirSync(cacheBase, { withFileTypes: true })) {
		if (!marketplace.isDirectory()) continue;
		const pluginDir = join(cacheBase, marketplace.name, pluginName);
		if (!existsSync(pluginDir)) continue;
		// deploy to each installed version
		for (const ver of readdirSync(pluginDir, { withFileTypes: true })) {
			if (!ver.isDirectory()) continue;
			const target = join(pluginDir, ver.name);
			cpSync(resolve(root, 'plugin'), target, { recursive: true });
			// install native dependencies (better-sqlite3)
			try {
				execSync('npm install --production --no-audit --no-fund', { cwd: target, stdio: 'pipe' });
				console.log(`  [ok] deployed + npm install: ${marketplace.name}/${pluginName}/${ver.name}`);
			} catch (e) {
				console.warn(`  [!!] deployed but npm install failed: ${marketplace.name}/${pluginName}/${ver.name}: ${e.message}`);
			}
			deployed = true;
		}
	}
}
if (!deployed) {
	console.log('  [--] no local plugin installation found (skip deploy)');
}

console.log(`\nBuild complete.${deployed ? ' Restart Claude Code to load changes.' : ''}`);
