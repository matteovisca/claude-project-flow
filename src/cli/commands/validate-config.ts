import { join } from "node:path";
import { parseConfig } from "../lib/config.js";
import { resolveProjectContext } from "../lib/paths.js";

interface Result {
	ok: boolean;
	warnings: string[];
	errors: string[];
}

export function validateConfig(args: string[]): number {
	const json = args.includes("--json");
	const ctx = resolveProjectContext();
	const result: Result = { ok: true, warnings: [], errors: [] };

	if (!ctx.configExists) {
		result.ok = false;
		result.errors.push("config.md not found at .project-flow/config.md");
		emit(result, json, "no config — run /project-flow:start-feature to scaffold");
		return 2;
	}

	try {
		const parsed = parseConfig(join(ctx.projectFlowDir, "config.md"));
		if (!parsed.identity?.name) result.warnings.push("missing Identity.name");
		if (!parsed.branch?.feature) result.warnings.push("missing Branch.feature");
		if (result.errors.length > 0) result.ok = false;
	} catch (e) {
		result.ok = false;
		result.errors.push(`parse error: ${(e as Error).message}`);
		emit(result, json, "check config.md syntax");
		return 2;
	}

	emit(result, json);
	return result.ok ? 0 : 1;
}

function emit(result: Result, json: boolean, hint?: string): void {
	if (json) {
		// include "error" (singular) for compatibility with callers expecting that key
		const error = result.errors.length > 0 ? result.errors[0] : undefined;
		console.log(JSON.stringify({ ...result, error, hint }));
	} else {
		if (result.ok) console.log("config ok");
		for (const w of result.warnings) console.log(`warning: ${w}`);
		for (const e of result.errors) console.error(`error: ${e}`);
		if (hint) console.error(`hint: ${hint}`);
	}
}
