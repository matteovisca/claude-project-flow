import { build } from 'esbuild';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';
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
	outfile: resolve(root, 'plugin/scripts/service.cjs'),
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

// Sync version in plugin manifest
const pluginJson = resolve(root, 'plugin/.claude-plugin/plugin.json');
const manifest = JSON.parse(readFileSync(pluginJson, 'utf-8'));
manifest.version = pkg.version;
const { writeFileSync } = await import('fs');
writeFileSync(pluginJson, JSON.stringify(manifest, null, '\t') + '\n');

console.log(`Build complete: plugin/scripts/service.cjs`);
