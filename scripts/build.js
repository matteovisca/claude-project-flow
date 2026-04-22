import { build } from "esbuild";
import { readFileSync, writeFileSync, chmodSync, cpSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));

console.log(`Building claude-project-flow v${pkg.version}`);

// 1. Bundle CLI
await build({
	entryPoints: [resolve(root, "src/cli/index.ts")],
	bundle: true,
	platform: "node",
	target: "node18",
	format: "cjs",
	outfile: resolve(root, "plugin/dist/pf.cjs"),
	minify: true,
	logLevel: "error",
});
console.log("  [ok] pf.cjs");

// 2. Shell wrapper
mkdirSync(resolve(root, "plugin/bin"), { recursive: true });
const wrapper = `#!/usr/bin/env bash\nexec node "$(dirname "$0")/../dist/pf.cjs" "$@"\n`;
writeFileSync(resolve(root, "plugin/bin/pf"), wrapper);
chmodSync(resolve(root, "plugin/bin/pf"), 0o755);
console.log("  [ok] bin/pf");

// 3. Copy skills (clean replace)
const pluginSkills = resolve(root, "plugin/skills");
if (existsSync(pluginSkills)) rmSync(pluginSkills, { recursive: true });
cpSync(resolve(root, "skills"), pluginSkills, { recursive: true });
console.log("  [ok] skills copied");

// 4. Copy hooks
mkdirSync(resolve(root, "plugin/hooks"), { recursive: true });
cpSync(resolve(root, "hooks/hooks.json"), resolve(root, "plugin/hooks/hooks.json"));
console.log("  [ok] hooks copied");

// 5. Sync manifest version
const manifestPath = resolve(root, ".claude-plugin/plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
manifest.version = pkg.version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
const pluginManifestPath = resolve(root, "plugin/.claude-plugin/plugin.json");
mkdirSync(resolve(root, "plugin/.claude-plugin"), { recursive: true });
writeFileSync(pluginManifestPath, JSON.stringify(manifest, null, "\t") + "\n");
console.log(`  [ok] version synced to ${pkg.version}`);

// 6. Sync marketplace.json
const mpPath = resolve(root, ".claude-plugin/marketplace.json");
if (existsSync(mpPath)) {
	const mp = JSON.parse(readFileSync(mpPath, "utf-8"));
	if (mp.plugins?.[0]) {
		mp.plugins[0].version = pkg.version;
		writeFileSync(mpPath, JSON.stringify(mp, null, "\t") + "\n");
		console.log("  [ok] marketplace.json synced");
	}
}

// 7. Verify required distribution files
const required = [
	"plugin/.claude-plugin/plugin.json",
	"plugin/hooks/hooks.json",
	"plugin/dist/pf.cjs",
	"plugin/bin/pf",
	"plugin/skills/init/SKILL.md",
	"plugin/skills/start-feature/SKILL.md",
	"plugin/skills/requirements/SKILL.md",
	"plugin/skills/plan/SKILL.md",
	"plugin/skills/close-feature/SKILL.md",
	"plugin/skills/man/SKILL.md",
];
for (const f of required) {
	if (!existsSync(resolve(root, f))) throw new Error(`missing: ${f}`);
}
console.log("  [ok] all distribution files verified");

console.log("Build complete.");
