import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveProjectContext } from "../lib/paths.js";

export function nextNumber(args: string[]): number {
	const target = args[0];
	if (!target || !target.includes("/")) {
		console.error("usage: pf next-number <slug>/<type>");
		return 2;
	}

	const [slug, type] = target.split("/", 2);

	if (!/^[a-z0-9_-]+$/.test(slug) || !/^[a-z0-9_-]+$/.test(type)) {
		console.error("invalid slug/type: lowercase alphanumeric, hyphens, underscores only");
		return 2;
	}

	const ctx = resolveProjectContext();
	const dir = join(ctx.projectFlowDir, "features", slug, type);

	if (!existsSync(dir)) {
		console.log("001");
		return 0;
	}

	const files = readdirSync(dir).filter((f) => /^\d{3}-.*\.md$/.test(f));
	let max = 0;
	for (const f of files) {
		const n = parseInt(f.slice(0, 3), 10);
		if (n > max) max = n;
	}

	console.log(String(max + 1).padStart(3, "0"));
	return 0;
}
