import { execSync } from "node:child_process";

export function currentBranch(cwd: string): string | null {
	try {
		const out = execSync("git branch --show-current", { cwd, encoding: "utf-8" });
		return out.trim() || null;
	} catch {
		return null;
	}
}

/**
 * Match current branch against branch pattern (e.g. "feature/<slug>") and extract slug.
 * Pattern uses "<slug>" as placeholder.
 */
export function extractSlug(branch: string, pattern: string): string | null {
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<slug>/g, "([A-Za-z0-9_-]+)");
	const re = new RegExp(`^${escaped}$`);
	const m = branch.match(re);
	return m?.[1] ?? null;
}
