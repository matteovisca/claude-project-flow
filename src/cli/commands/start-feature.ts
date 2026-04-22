import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProjectContext, featureDir } from "../lib/paths.js";

interface Opts {
	slug: string;
	branch?: string;
	from?: string;
	json: boolean;
}

export function startFeature(args: string[]): number {
	const opts = parseArgs(args);
	if (!opts.slug) {
		console.error("usage: pf start-feature <slug> [--branch <b>] [--from <base>] [--json]");
		return 2;
	}

	const ctx = resolveProjectContext();
	const dir = featureDir(ctx.projectFlowDir, opts.slug);

	if (existsSync(dir)) {
		const err = { error: `feature ${opts.slug} already exists`, hint: "checkout the branch manually or choose a different slug" };
		if (opts.json) console.log(JSON.stringify(err));
		else console.error(err.error);
		return 1;
	}

	// create branch
	const branchName = opts.branch ?? `feature/${opts.slug}`;
	try {
		execSync(`git checkout -b ${branchName}${opts.from ? ` ${opts.from}` : ""}`, { cwd: ctx.projectRoot, stdio: "pipe" });
	} catch (e) {
		const err = { error: `git checkout failed: ${(e as Error).message}`, hint: "ensure working tree is clean" };
		if (opts.json) console.log(JSON.stringify(err));
		else console.error(err.error);
		return 2;
	}

	// scaffold dirs
	mkdirSync(join(dir, "requirements"), { recursive: true });
	mkdirSync(join(dir, "plans"), { recursive: true });

	// context.md
	const author = safeGit("git config user.name", ctx.projectRoot) ?? "unknown";
	const created = new Date().toISOString().slice(0, 10);
	const contextBody = `---
status: draft
slug: ${opts.slug}
branch: ${branchName}
created_at: ${created}
author: ${author}
---

# Feature: ${opts.slug}

## Sessions
- ${created} — feature started

## Plans
_(none yet — use /project-flow:plan)_

## Requirements updates
_(none yet — use /project-flow:requirements)_
`;
	writeFileSync(join(dir, "context.md"), contextBody);

	const result = { slug: opts.slug, branch: branchName, featureDir: dir, next: "invoke /project-flow:requirements" };
	if (opts.json) console.log(JSON.stringify(result));
	else {
		console.log(`feature ${opts.slug} created on ${branchName}`);
		console.log(`next: invoke /project-flow:requirements`);
	}
	return 0;
}

function parseArgs(args: string[]): Opts {
	const opts: Opts = { slug: "", json: false };
	for (let i = 0; i < args.length; i++) {
		const a = args[i];
		if (a === "--branch") opts.branch = args[++i];
		else if (a === "--from") opts.from = args[++i];
		else if (a === "--json") opts.json = true;
		else if (!opts.slug) opts.slug = a;
	}
	return opts;
}

function safeGit(cmd: string, cwd: string): string | null {
	try {
		return execSync(cmd, { cwd, encoding: "utf-8" }).trim() || null;
	} catch {
		return null;
	}
}
