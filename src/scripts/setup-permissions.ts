import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const PLUGIN_NAME = 'claude-project-flow';

interface Settings {
	permissions?: {
		allow?: string[];
		deny?: string[];
		additionalDirectories?: string[];
	};
	[key: string]: unknown;
}

// find all installed plugin cache paths
function findPluginCachePaths(): string[] {
	const cacheBase = join(homedir(), '.claude', 'plugins', 'cache');
	const paths: string[] = [];
	if (!existsSync(cacheBase)) return paths;

	for (const marketplace of readdirSync(cacheBase, { withFileTypes: true })) {
		if (!marketplace.isDirectory()) continue;
		const pluginDir = join(cacheBase, marketplace.name, PLUGIN_NAME);
		if (!existsSync(pluginDir)) continue;
		for (const ver of readdirSync(pluginDir, { withFileTypes: true })) {
			if (!ver.isDirectory()) continue;
			paths.push(join(pluginDir, ver.name));
		}
	}
	return paths;
}

// list all .cjs scripts in a plugin cache path
function findScripts(pluginPath: string): string[] {
	const distDir = join(pluginPath, 'scripts', 'dist');
	if (!existsSync(distDir)) return [];
	return readdirSync(distDir)
		.filter(f => f.endsWith('.cjs') && f !== 'service.cjs') // service.cjs is for hooks, not direct execution
		.map(f => join(distDir, f));
}

// generate permission entries for a set of scripts
function generatePermissions(scripts: string[]): string[] {
	return scripts.map(s => `Bash(node "${s}")`);
}

// MCP tools that should be allowed
function mcpToolPermissions(): string[] {
	return [
		`mcp__plugin_${PLUGIN_NAME}_project-flow__feature_get`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__feature_list`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__feature_update`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__knowledge_index`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__knowledge_search`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__project_list`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__project_register`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__settings_get`,
		`mcp__plugin_${PLUGIN_NAME}_project-flow__settings_update`,
	];
}

function readSettings(path: string): Settings {
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, 'utf-8'));
	} catch {
		return {};
	}
}

function writeSettings(path: string, settings: Settings): void {
	const dir = resolve(path, '..');
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	writeFileSync(path, JSON.stringify(settings, null, '\t') + '\n');
}

// --- main ---
const args = process.argv.slice(2);
const command = args[0] || 'list';
const projectDir = args.find(a => a.startsWith('--project-dir='))?.split('=')[1];
const target = args.find(a => a.startsWith('--target='))?.split('=')[1] || 'project';
const jsonOutput = args.includes('--json');

const cachePaths = findPluginCachePaths();
if (cachePaths.length === 0) {
	const result = { success: false, error: 'Plugin non installato. Installa prima il plugin con il marketplace.' };
	if (jsonOutput) console.log(JSON.stringify(result));
	else console.error(result.error);
	process.exit(1);
}

// collect all scripts from all cache paths
const allScripts = cachePaths.flatMap(findScripts);
const scriptPerms = generatePermissions(allScripts);
const mcpPerms = mcpToolPermissions();
const allPerms = [...scriptPerms, ...mcpPerms];

if (command === 'list') {
	const result = {
		success: true,
		command: 'list',
		cachePaths,
		permissions: {
			scripts: scriptPerms,
			mcpTools: mcpPerms,
			total: allPerms.length,
		}
	};
	if (jsonOutput) {
		console.log(JSON.stringify(result, null, '\t'));
	} else {
		console.log('\n📋 Permessi richiesti dal plugin claude-project-flow:\n');
		console.log('Script CLI:');
		scriptPerms.forEach(p => console.log(`  ✦ ${p}`));
		console.log('\nMCP Tools:');
		mcpPerms.forEach(p => console.log(`  ✦ ${p}`));
		console.log(`\nTotale: ${allPerms.length} permessi`);
	}
} else if (command === 'apply') {
	const settingsPath = target === 'global'
		? join(homedir(), '.claude', 'settings.json')
		: projectDir
			? join(projectDir, '.claude', 'settings.json')
			: null;

	if (!settingsPath) {
		const result = { success: false, error: 'Specificare --project-dir=<path> oppure --target=global' };
		if (jsonOutput) console.log(JSON.stringify(result));
		else console.error(result.error);
		process.exit(1);
	}

	const settings = readSettings(settingsPath);
	if (!settings.permissions) settings.permissions = {};
	if (!settings.permissions.allow) settings.permissions.allow = [];

	const existing = new Set(settings.permissions.allow);
	const added: string[] = [];
	const skipped: string[] = [];

	for (const perm of allPerms) {
		if (existing.has(perm)) {
			skipped.push(perm);
		} else {
			settings.permissions.allow.push(perm);
			added.push(perm);
		}
	}

	writeSettings(settingsPath, settings);

	const result = {
		success: true,
		command: 'apply',
		target,
		settingsPath,
		added: added.length,
		skipped: skipped.length,
		addedPerms: added,
		skippedPerms: skipped,
	};

	if (jsonOutput) {
		console.log(JSON.stringify(result, null, '\t'));
	} else {
		console.log(`\n✅ Permessi applicati a ${settingsPath}`);
		console.log(`   Aggiunti: ${added.length}`);
		console.log(`   Già presenti: ${skipped.length}`);
		if (added.length > 0) {
			console.log('\nNuovi permessi:');
			added.forEach(p => console.log(`  + ${p}`));
		}
	}
} else {
	console.error(`Comando sconosciuto: ${command}. Usa 'list' o 'apply'.`);
	process.exit(1);
}
