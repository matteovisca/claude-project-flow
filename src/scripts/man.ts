// lists all available skills and scripts with metadata
// usage: node man.cjs [--json]
//        node man.cjs <skill-or-script-name> [--json]

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

interface SkillInfo {
	name: string;
	command: string;
	description: string;
	parameters: string;
	category: 'setup' | 'feature-lifecycle' | 'development' | 'sync' | 'info';
}

interface ScriptInfo {
	name: string;
	file: string;
	description: string;
	subcommands: string[];
	usage: string;
}

interface ManOutput {
	skills: SkillInfo[];
	scripts: ScriptInfo[];
	detail?: string;
}

function findSkillsDir(): string {
	// try CLAUDE_PLUGIN_ROOT first
	const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
	if (pluginRoot) {
		const dir = join(pluginRoot, 'skills');
		if (existsSync(dir)) return dir;
	}
	// fallback: relative to this script
	const scriptDir = dirname(process.argv[1]);
	const candidate = join(scriptDir, '..', '..', 'skills');
	if (existsSync(candidate)) return candidate;
	// fallback: cwd-based
	return join(process.cwd(), 'skills');
}

function parseSkillMd(path: string): { description: string; parameters: string; content: string } {
	const content = readFileSync(path, 'utf-8');
	const descMatch = content.match(/^description:\s*(.+)$/m);
	const paramMatch = content.match(/^## Parameters\n([\s\S]*?)(?=\n## )/m);
	const params = paramMatch?.[1]?.trim()
		?.split('\n')
		.filter(l => l.startsWith('- '))
		.map(l => l.replace(/^- /, '').trim())
		.join('; ') ?? 'none';

	return {
		description: descMatch?.[1] ?? '',
		parameters: params,
		content,
	};
}

function categorize(name: string): SkillInfo['category'] {
	if (['setup', 'project-init'].includes(name)) return 'setup';
	if (name.startsWith('feature-')) return 'feature-lifecycle';
	if (['session-save', 'discover-patterns', 'requirements-sync'].includes(name)) return 'development';
	if (name === 'sync') return 'sync';
	return 'info';
}

function loadSkills(): SkillInfo[] {
	const skillsDir = findSkillsDir();
	const skills: SkillInfo[] = [];

	try {
		for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const skillFile = join(skillsDir, entry.name, 'SKILL.md');
			if (!existsSync(skillFile)) continue;

			const parsed = parseSkillMd(skillFile);
			skills.push({
				name: entry.name,
				command: `/claude-project-flow:${entry.name}`,
				description: parsed.description,
				parameters: parsed.parameters,
				category: categorize(entry.name),
			});
		}
	} catch { /* skills dir not found */ }

	return skills.sort((a, b) => {
		const catOrder = ['setup', 'feature-lifecycle', 'development', 'sync', 'info'];
		return catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.name.localeCompare(b.name);
	});
}

function loadScripts(): ScriptInfo[] {
	return [
		{
			name: 'sync',
			file: 'sync.cjs',
			description: 'Sincronizza cartella documentale via git e riconcilia DB locale',
			subcommands: ['pull', 'push', 'status', 'all (default)'],
			usage: 'node sync.cjs [pull|push|status] [--json]',
		},
		{
			name: 'sign',
			file: 'sign.cjs',
			description: 'Firma documenti markdown con footer autore e tag inline',
			subcommands: ['footer <file> <desc>', 'tag'],
			usage: 'node sign.cjs <footer|tag> [args]',
		},
		{
			name: 'context-loader',
			file: 'context-loader.cjs',
			description: 'Carica tutto il contesto di una feature o progetto in JSON strutturato',
			subcommands: ['<feature-name>', '--project <name>', '(none = all projects)'],
			usage: 'node context-loader.cjs [feature|--project name] [--json]',
		},
		{
			name: 'git-ops',
			file: 'git-ops.cjs',
			description: 'Pre-processa operazioni git in JSON strutturato',
			subcommands: ['diff [base]', 'log [count] [since]', 'merge-check [target]', 'branch-info'],
			usage: 'node git-ops.cjs <command> [args] [--json]',
		},
		{
			name: 'feature-scaffold',
			file: 'feature-scaffold.cjs',
			description: 'Scaffolding, archiving e chiusura feature',
			subcommands: ['init --name <n> --branch <b> --desc <d>', 'archive <feature>', 'close <feature> --reason <r> --status <s>'],
			usage: 'node feature-scaffold.cjs <command> [args] [--json]',
		},
	];
}

function getDetail(name: string, skills: SkillInfo[]): string | null {
	const skillsDir = findSkillsDir();
	const skillFile = join(skillsDir, name, 'SKILL.md');
	if (existsSync(skillFile)) {
		return readFileSync(skillFile, 'utf-8');
	}
	return null;
}

// --- MAIN ---
function main() {
	const args = process.argv.slice(2).filter(a => a !== '--json');
	const jsonOutput = process.argv.includes('--json');
	const query = args[0]?.replace('/claude-project-flow:', '');

	const skills = loadSkills();
	const scripts = loadScripts();

	if (query) {
		// detail mode
		const detail = getDetail(query, skills);
		const skill = skills.find(s => s.name === query);
		const script = scripts.find(s => s.name === query);

		if (jsonOutput) {
			console.log(JSON.stringify({ skill, script, detail: detail?.substring(0, 2000) }, null, 2));
		} else {
			if (skill) {
				console.log(`\n📖 ${skill.command}`);
				console.log(`   ${skill.description}`);
				console.log(`   Parametri: ${skill.parameters}`);
				console.log(`   Categoria: ${skill.category}`);
			}
			if (script) {
				console.log(`\n🔧 ${script.name} (${script.file})`);
				console.log(`   ${script.description}`);
				console.log(`   Usage: ${script.usage}`);
				console.log(`   Comandi: ${script.subcommands.join(' | ')}`);
			}
			if (!skill && !script) {
				console.log(`\n❌ "${query}" non trovato. Usa 'man' senza argomenti per la lista completa.`);
			}
		}
		return;
	}

	// list mode
	if (jsonOutput) {
		console.log(JSON.stringify({ skills, scripts }, null, 2));
		return;
	}

	const categories: Record<string, string> = {
		'setup': '🔧 Setup',
		'feature-lifecycle': '🔄 Feature Lifecycle',
		'development': '💻 Sviluppo',
		'sync': '🔁 Sincronizzazione',
		'info': 'ℹ️  Info',
	};

	console.log('\n╔══════════════════════════════════════════════════════╗');
	console.log('║         claude-project-flow — Manuale                ║');
	console.log('╚══════════════════════════════════════════════════════╝');

	// group by category
	let lastCat = '';
	for (const skill of skills) {
		if (skill.category !== lastCat) {
			lastCat = skill.category;
			console.log(`\n${categories[skill.category] ?? skill.category}`);
		}
		const cmd = skill.command.padEnd(45);
		console.log(`  ${cmd} ${skill.description.substring(0, 60)}`);
	}

	console.log('\n📦 Script standalone (eseguibili da terminale)');
	for (const script of scripts) {
		console.log(`  ${script.name.padEnd(20)} ${script.description}`);
		console.log(`  ${''.padEnd(20)} Usage: ${script.usage}`);
	}

	console.log('\n💡 Per dettagli: node man.cjs <nome-skill-o-script>');
	console.log('');
}

main();
