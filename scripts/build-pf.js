import { build } from "esbuild";
import { mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");

await build({
	entryPoints: [resolve(root, "src/cli/index.ts")],
	bundle: true,
	platform: "node",
	target: "node18",
	format: "cjs",
	outfile: resolve(root, "plugin/dist/pf.cjs"),
	minify: false,
	logLevel: "error",
});

mkdirSync(resolve(root, "plugin/bin"), { recursive: true });
const wrapper = `#!/usr/bin/env bash\nexec node "$(dirname "$0")/../dist/pf.cjs" "$@"\n`;
writeFileSync(resolve(root, "plugin/bin/pf"), wrapper);
chmodSync(resolve(root, "plugin/bin/pf"), 0o755);
console.log("built plugin/dist/pf.cjs and plugin/bin/pf");
