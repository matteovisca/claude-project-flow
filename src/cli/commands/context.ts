import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseConfig } from "../lib/config.js";
import { currentBranch, extractSlug } from "../lib/git.js";
import { featureDir, resolveProjectContext } from "../lib/paths.js";

export function context(args: string[]): number {
	const json = args.includes("--json");
	const ctx = resolveProjectContext();

	if (!ctx.configExists) {
		emitError(json, "config.md not found", "run /project-flow:init to scaffold");
		return 2;
	}

	const parsed = parseConfig(join(ctx.projectFlowDir, "config.md"));
	const branch = currentBranch(ctx.projectRoot);
	let feature: string | null = null;

	if (branch && parsed.branch?.feature) {
		feature = extractSlug(branch, parsed.branch.feature);
	}

	const result = {
		project: parsed.identity?.name ?? null,
		family: parsed.identity?.family ?? null,
		branch,
		feature,
		feature_dir: feature && existsSync(featureDir(ctx.projectFlowDir, feature))
			? featureDir(ctx.projectFlowDir, feature)
			: null,
		plugins: parsed.plugins ?? {},
		announce: parsed.workflow?.announceDefault ?? "hybrid",
	};

	if (json) {
		console.log(JSON.stringify(result));
	} else {
		console.log(`project: ${result.project ?? "?"} (${result.family ?? "?"})`);
		console.log(`branch:  ${result.branch ?? "(not in git)"}`);
		console.log(`feature: ${result.feature ?? "(none)"}`);
	}
	return 0;
}

function emitError(json: boolean, error: string, hint: string): void {
	if (json) console.log(JSON.stringify({ error, hint }));
	else {
		console.error(`error: ${error}`);
		console.error(`hint: ${hint}`);
	}
}
