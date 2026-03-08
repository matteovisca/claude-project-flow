import { build } from 'esbuild';
import { readFileSync, writeFileSync, cpSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
		'better-sqlite3': pkg.dependencies['better-sqlite3']
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
	'plugin/scripts/smart-install.js',
];
for (const filePath of requiredFiles) {
	if (!existsSync(resolve(root, filePath))) {
		throw new Error(`Missing required distribution file: ${filePath}`);
	}
}
console.log('  [ok] all distribution files verified');

console.log(`\nBuild complete.`);
