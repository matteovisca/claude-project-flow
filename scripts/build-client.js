// Build React client → self-contained HTML bundle
import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const isDev = process.argv.includes('--dev');
const tmpDir = resolve(root, '.build-tmp');

// clean tmp
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

// build React app to temp dir
await build({
	entryPoints: [resolve(root, 'src/dashboard/client/index.tsx')],
	bundle: true,
	platform: 'browser',
	target: 'es2020',
	format: 'esm',
	jsx: 'automatic',
	jsxImportSource: 'react',
	outdir: tmpDir,
	minify: !isDev,
	sourcemap: isDev ? 'inline' : false,
	logLevel: 'error',
	loader: {
		'.css': 'css',
		'.tsx': 'tsx',
		'.ts': 'ts',
	},
	define: {
		'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
	},
});

// read generated JS and CSS
let jsCode = '';
let cssCode = '';
for (const file of readdirSync(tmpDir)) {
	const content = readFileSync(join(tmpDir, file), 'utf-8');
	if (file.endsWith('.js')) jsCode = content;
	if (file.endsWith('.css')) cssCode = content;
}

// cleanup tmp
rmSync(tmpDir, { recursive: true });

// generate self-contained HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>claude-project-flow dashboard</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous">
	<style>${cssCode}</style>
</head>
<body>
	<div id="root"></div>
	<script type="module">${jsCode}</script>
</body>
</html>`;

const outPath = resolve(root, 'plugin/scripts/dist/dashboard-ui.html');
writeFileSync(outPath, html);
console.log(`  [ok] dashboard-ui.html built (${isDev ? 'dev' : 'prod'}, ${Math.round(html.length / 1024)}KB)`);
