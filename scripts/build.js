import { build } from 'esbuild';
import { readFileSync, writeFileSync, cpSync } from 'fs';
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

// Sync version in plugin manifest and marketplace
const pluginJson = resolve(root, 'plugin/.claude-plugin/plugin.json');
const manifest = JSON.parse(readFileSync(pluginJson, 'utf-8'));
manifest.version = pkg.version;
writeFileSync(pluginJson, JSON.stringify(manifest, null, '\t') + '\n');

const marketplaceJson = resolve(root, '.claude-plugin/marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplaceJson, 'utf-8'));
marketplace.plugins[0].version = pkg.version;
writeFileSync(marketplaceJson, JSON.stringify(marketplace, null, '\t') + '\n');

// Sync skills and hooks into plugin/
cpSync(resolve(root, 'skills'), resolve(root, 'plugin/skills'), { recursive: true });
cpSync(resolve(root, 'hooks/hooks.json'), resolve(root, 'plugin/hooks/hooks.json'));

console.log(`Build complete: plugin/scripts/dist/service.cjs`);
