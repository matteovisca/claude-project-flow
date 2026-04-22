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
	while (dir !== "/") {
		if (existsSync(join(dir, ".git"))) return dir;
		dir = resolve(dir, "..");
	}
	return resolve(start);
}

export function featureDir(projectFlowDir: string, slug: string): string {
	return join(projectFlowDir, "features", slug);
}
