import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ProjectContext } from "./types.js";

export function resolveProjectContext(cwd: string = process.cwd()): ProjectContext {
	const projectRoot = findProjectRoot(cwd);
	const projectFlowDir = join(projectRoot, ".project-flow");
	return {
		projectRoot,
		projectFlowDir,
		configExists: existsSync(join(projectFlowDir, "config.md")),
		contextExists: existsSync(join(projectFlowDir, "context.md")),
	};
}

function findProjectRoot(start: string): string {
	let dir = resolve(start);
	while (true) {
		if (existsSync(join(dir, ".git"))) return dir;
		const parent = resolve(dir, "..");
		if (parent === dir) break;
		dir = parent;
	}
	return resolve(start);
}

export function featureDir(projectFlowDir: string, slug: string): string {
	if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
		throw new Error(`invalid slug: ${slug}`);
	}
	return join(projectFlowDir, "features", slug);
}
