# Project Flow v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild claude-project-flow as a lean per-project workflow orchestrator: 5 skill + mini-CLI + filesystem-only persistence, no DB, no MCP, no dashboard.

**Architecture:** Three layers — markdown skills (dialog/orchestration), mini-CLI `pf` (deterministic operations, <200 LOC), filesystem `.project-flow/` (markdown, git-versioned). Delegates to external plugins (`superpowers`, `codex`) installed separately.

**Tech Stack:** TypeScript 5.x, Node.js ≥18, esbuild (single bundle CJS), bash integration tests (zero extra deps).

**Reference spec:** [docs/superpowers/specs/2026-04-21-project-flow-orchestrator-design.md](../specs/2026-04-21-project-flow-orchestrator-design.md)

---

## File Structure

### New files

```
<plugin-root>/
├── .claude-plugin/
│   ├── marketplace.json              # updated (version 0.2.0)
│   └── plugin.json                   # updated
├── hooks/
│   └── hooks.json                    # lean: SessionStart only
├── skills/                           # all 5 rewritten from scratch
│   ├── start-feature/SKILL.md
│   ├── requirements/SKILL.md
│   ├── plan/SKILL.md
│   ├── close-feature/SKILL.md
│   └── man/SKILL.md
├── src/
│   └── cli/
│       ├── index.ts                  # dispatcher
│       ├── commands/
│       │   ├── context.ts            # `pf context`
│       │   ├── start-feature.ts      # `pf start-feature`
│       │   ├── next-number.ts        # `pf next-number`
│       │   └── validate-config.ts    # `pf validate-config`
│       └── lib/
│           ├── config.ts             # parse .project-flow/config.md
│           ├── git.ts                # branch detection
│           ├── paths.ts              # resolve .project-flow paths
│           └── types.ts              # shared types
├── test/
│   ├── run-all.sh                    # test runner
│   ├── fixtures/                     # sample .project-flow/ structures
│   └── cmd/
│       ├── test-context.sh
│       ├── test-start-feature.sh
│       ├── test-next-number.sh
│       └── test-validate-config.sh
├── scripts/
│   └── build.js                      # esbuild single entry
├── plugin/                           # build artifacts (shipped)
│   ├── .claude-plugin/plugin.json
│   ├── hooks/hooks.json
│   ├── skills/                       # copied from /skills
│   ├── bin/pf                        # shell wrapper
│   └── dist/pf.cjs                   # bundled CLI
├── docs/
│   ├── superpowers/                  # this dir (specs + plans)
│   └── UPSTREAM.md                   # superpowers watch policy
├── package.json                      # slimmed down
├── tsconfig.json                     # reset to minimum
├── README.md                         # rewritten
└── THIRD-PARTY-NOTICES.md            # MIT attribution for future forks
```

### Files to delete (in phase 1)

```
src/dashboard/                        # React client + Hono server
src/server/mcp-server.ts              # MCP server
src/db/                                # SQLite schema + wrapper
src/hooks/                             # session-start/stop/end.ts
src/scripts/                           # context-loader, feature-scaffold, etc.
src/utils/                             # git-user, doc-signature
plugin/scripts/                        # old bundled dist/
skills/                                # all existing skills (discover-patterns, feature-*, etc.)
.mcp.json                              # MCP declaration
install.sh                             # replaced by marketplace install
```

---

## Phase 0 — Safety and setup

### Task 0.1: Tag rollback point

**Files:**
- Git metadata only

- [ ] **Step 1: Create annotated tag on current tip**

```bash
git tag -a pre-v1-redesign -m "Rollback point before v1 orchestrator redesign"
```

- [ ] **Step 2: Verify tag created**

Run: `git tag -l pre-v1-redesign --format="%(refname:short) %(subject)"`
Expected: `pre-v1-redesign Rollback point before v1 orchestrator redesign`

- [ ] **Step 3: No commit needed for tag (tags are not commits)**

---

## Phase 1 — Demolition of legacy code

Each deletion is a single commit so we can revert granularly if needed.

### Task 1.1: Remove dashboard (client + server)

**Files:**
- Delete: `src/dashboard/` (entire directory)

- [ ] **Step 1: Remove dashboard directory**

```bash
rm -rf src/dashboard
```

- [ ] **Step 2: Verify removal**

Run: `ls src/ 2>&1 | grep dashboard || echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione completa dashboard React+Hono"
```

### Task 1.2: Remove MCP server

**Files:**
- Delete: `src/server/`
- Delete: `.mcp.json`

- [ ] **Step 1: Remove MCP server + config**

```bash
rm -rf src/server
rm -f .mcp.json
```

- [ ] **Step 2: Verify**

Run: `ls src/ .mcp.json 2>&1 | grep -E "server|mcp" || echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione MCP server e manifesto"
```

### Task 1.3: Remove SQLite DB layer

**Files:**
- Delete: `src/db/`

- [ ] **Step 1: Remove db directory**

```bash
rm -rf src/db
```

- [ ] **Step 2: Verify**

Run: `[ ! -d src/db ] && echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione layer SQLite"
```

### Task 1.4: Remove legacy hooks and utils

**Files:**
- Delete: `src/hooks/`
- Delete: `src/utils/`

- [ ] **Step 1: Remove**

```bash
rm -rf src/hooks src/utils
```

- [ ] **Step 2: Verify**

Run: `[ ! -d src/hooks ] && [ ! -d src/utils ] && echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione vecchi hook e utils"
```

### Task 1.5: Remove legacy scripts (TypeScript sources)

**Files:**
- Delete: `src/scripts/`

- [ ] **Step 1: Remove**

```bash
rm -rf src/scripts
```

- [ ] **Step 2: Verify**

Run: `[ ! -d src/scripts ] && echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione vecchi script sorgente"
```

### Task 1.6: Remove legacy skills

**Files:**
- Delete: `skills/` (entire directory — all 13 skills rewritten from scratch)

- [ ] **Step 1: Remove**

```bash
rm -rf skills
```

- [ ] **Step 2: Verify**

Run: `[ ! -d skills ] && echo "removed"`
Expected: `removed`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione vecchie skill (riscritte da zero)"
```

### Task 1.7: Remove legacy plugin/ build artifacts

**Files:**
- Delete: `plugin/scripts/` (old dist + smart-install.js)
- Delete: `plugin/skills/` (old copied skills)
- Delete: `plugin/hooks/hooks.json` (old hook config)
- Delete: `plugin/package.json` (old runtime package)
- Delete: `plugin/CLAUDE.md` (redundant)

- [ ] **Step 1: Remove**

```bash
rm -rf plugin/scripts plugin/skills
rm -f plugin/hooks/hooks.json plugin/package.json plugin/CLAUDE.md
```

- [ ] **Step 2: Verify**

Run: `ls plugin/ 2>&1`
Expected: only `.claude-plugin/` remains (plugin.json will be rewritten next)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rimozione artefatti di build del vecchio plugin/"
```

### Task 1.8: Remove install.sh and update .gitignore

**Files:**
- Delete: `install.sh`
- Modify: `.gitignore` (add `plugin/dist/`, keep `node_modules`)

- [ ] **Step 1: Remove install.sh**

```bash
rm -f install.sh
```

- [ ] **Step 2: Update .gitignore**

Write `.gitignore`:

```
node_modules/
*.log
.DS_Store
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: rimozione install.sh e pulizia gitignore"
```

---

## Phase 2 — Scaffold new project

### Task 2.1: Slim down package.json

**Files:**
- Modify: `package.json` (complete rewrite, from 15+ runtime deps down to 0)

- [ ] **Step 1: Write new package.json**

Content:

```json
{
	"name": "claude-project-flow",
	"version": "0.2.0",
	"private": true,
	"type": "module",
	"scripts": {
		"build": "node scripts/build.js",
		"test": "bash test/run-all.sh"
	},
	"devDependencies": {
		"@types/node": "^22.0.0",
		"esbuild": "^0.25.0",
		"typescript": "^5.9.0"
	},
	"engines": {
		"node": ">=18.0.0"
	}
}
```

- [ ] **Step 2: Remove old lockfile and regenerate**

```bash
rm -f package-lock.json
npm install
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: package.json snellito (zero runtime deps)"
```

### Task 2.2: Reset tsconfig.json

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Write minimal tsconfig**

Content:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"strict": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"resolveJsonModule": true,
		"noEmit": true,
		"types": ["node"]
	},
	"include": ["src/**/*"]
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: tsconfig ridotto al minimo (no-emit, solo type-check)"
```

### Task 2.3: Create CLI directory skeleton

**Files:**
- Create: `src/cli/index.ts`
- Create: `src/cli/commands/` (empty directory, populated in phase 3)
- Create: `src/cli/lib/` (empty directory, populated in phase 3)

- [ ] **Step 1: Write minimal CLI dispatcher**

Write `src/cli/index.ts`:

```typescript
#!/usr/bin/env node
const cmd = process.argv[2];
const args = process.argv.slice(3);

async function main() {
	switch (cmd) {
		case "context":
		case "start-feature":
		case "next-number":
		case "validate-config":
			console.error(`not implemented: ${cmd}`);
			process.exit(1);
		default:
			console.error(`usage: pf <context|start-feature|next-number|validate-config> [args]`);
			process.exit(2);
	}
}

main().catch((err) => {
	console.error(JSON.stringify({ error: err.message, hint: "unexpected failure" }));
	process.exit(2);
});
```

- [ ] **Step 2: Create lib and commands directories with placeholder**

```bash
mkdir -p src/cli/commands src/cli/lib
touch src/cli/commands/.gitkeep src/cli/lib/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add src/cli
git commit -m "feat(cli): scheletro iniziale del dispatcher pf"
```

### Task 2.4: Create test skeleton

**Files:**
- Create: `test/run-all.sh`
- Create: `test/cmd/` (empty, populated in phase 3)
- Create: `test/fixtures/`

- [ ] **Step 1: Write test runner**

Write `test/run-all.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

TESTS_DIR=./cmd
if [ ! -d "$TESTS_DIR" ]; then
	echo "no tests yet"
	exit 0
fi

failed=0
passed=0
for t in "$TESTS_DIR"/test-*.sh; do
	[ -f "$t" ] || continue
	echo "▸ $(basename "$t")"
	if bash "$t"; then
		passed=$((passed + 1))
	else
		failed=$((failed + 1))
	fi
done

echo ""
echo "passed: $passed, failed: $failed"
[ "$failed" -eq 0 ]
```

- [ ] **Step 2: Make executable and scaffold dirs**

```bash
chmod +x test/run-all.sh
mkdir -p test/cmd test/fixtures
touch test/cmd/.gitkeep test/fixtures/.gitkeep
```

- [ ] **Step 3: Verify runner works with no tests**

Run: `bash test/run-all.sh`
Expected: `no tests yet`

- [ ] **Step 4: Commit**

```bash
git add test
git commit -m "test: scaffold test runner bash e dirs"
```

---

## Phase 3 — Mini-CLI (TDD)

Each command follows: test first → build fails → implementation → build passes.

### Task 3.1: Lib utilities — paths and config types

**Files:**
- Create: `src/cli/lib/types.ts`
- Create: `src/cli/lib/paths.ts`

- [ ] **Step 1: Write types**

Write `src/cli/lib/types.ts`:

```typescript
export interface ProjectContext {
	projectRoot: string;
	projectFlowDir: string;
	configExists: boolean;
	contextExists: boolean;
}

export interface ParsedConfig {
	identity?: {
		name?: string;
		family?: string;
		stack?: string;
		description?: string;
	};
	branch?: {
		feature?: string;
		us?: string;
		fix?: string;
	};
	folderLayout?: Record<string, string>;
	plugins?: Record<string, string>;
	workflow?: {
		crossReview?: "suggested" | "required" | "off";
		scopeAudit?: "on" | "off";
		announceDefault?: "hybrid" | "always-confirm" | "always-proceed";
	};
	glossary?: Record<string, string>;
}

export interface CliError {
	error: string;
	hint: string;
}
```

- [ ] **Step 2: Write paths helper**

Write `src/cli/lib/paths.ts`:

```typescript
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/cli/lib
git commit -m "feat(cli): tipi condivisi e helper per path risolution"
```

### Task 3.2: Lib utilities — config parser

**Files:**
- Create: `src/cli/lib/config.ts`

- [ ] **Step 1: Write config parser**

Write `src/cli/lib/config.ts`:

```typescript
import { readFileSync } from "node:fs";
import type { ParsedConfig } from "./types.js";

/**
 * Parse .project-flow/config.md into a ParsedConfig.
 * Recognizes top-level H2 sections and extracts `- key: value` list items.
 * Lines starting with `#` inside a section are ignored (defaults placeholders).
 */
export function parseConfig(path: string): ParsedConfig {
	const raw = readFileSync(path, "utf-8");
	const config: ParsedConfig = {};
	const lines = raw.split(/\r?\n/);
	let section: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("## ")) {
			section = trimmed.slice(3).trim().toLowerCase();
			continue;
		}
		if (!section) continue;
		if (trimmed.startsWith("#") || trimmed === "") continue;
		if (!trimmed.startsWith("-")) continue;

		const body = trimmed.slice(1).trim();
		const match = body.match(/^([a-zA-Z0-9_.-]+):\s*(.+?)(?:\s*#.*)?$/);
		if (!match) continue;
		const [, key, valueRaw] = match;
		const value = valueRaw.replace(/^`|`$/g, "").trim();

		applySection(config, section, key, value);
	}

	return config;
}

function applySection(config: ParsedConfig, section: string, key: string, value: string): void {
	switch (section) {
		case "identity":
			config.identity = { ...config.identity, [key]: value };
			break;
		case "branch convention":
			config.branch = { ...config.branch, [key]: value };
			break;
		case "folder layout":
			config.folderLayout = { ...config.folderLayout, [key]: value };
			break;
		case "plugin mapping":
			config.plugins = { ...config.plugins, [key]: value };
			break;
		case "workflow rules":
			config.workflow = { ...config.workflow, [toCamel(key)]: value };
			break;
		case "glossary":
			config.glossary = { ...config.glossary, [key]: value };
			break;
	}
}

function toCamel(s: string): string {
	return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/cli/lib/config.ts
git commit -m "feat(cli): parser per config.md (H2 sections + key:value)"
```

### Task 3.3: Lib utilities — git branch detection

**Files:**
- Create: `src/cli/lib/git.ts`

- [ ] **Step 1: Write git helper**

Write `src/cli/lib/git.ts`:

```typescript
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
	return m ? m[1] : null;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/cli/lib/git.ts
git commit -m "feat(cli): helper git per branch corrente + estrazione slug"
```

### Task 3.4: Command — validate-config (test first)

**Files:**
- Create: `test/cmd/test-validate-config.sh`
- Create: `test/fixtures/valid-config/.project-flow/config.md`
- Create: `test/fixtures/missing-config/` (empty)

- [ ] **Step 1: Write the failing test**

Write `test/cmd/test-validate-config.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

PF="../plugin/bin/pf"

# Case 1: config exists and is valid
cd fixtures/valid-config
out=$("$PF" validate-config --json)
echo "$out" | grep -q '"ok":true' || { echo "FAIL: expected ok:true"; exit 1; }
cd ../..

# Case 2: config missing
cd fixtures/missing-config
set +e
out=$("$PF" validate-config --json)
code=$?
set -e
[ "$code" -eq 2 ] || { echo "FAIL: expected exit 2 on missing config, got $code"; exit 1; }
echo "$out" | grep -q '"error"' || { echo "FAIL: expected error in output"; exit 1; }
cd ../..

echo "  pass"
```

- [ ] **Step 2: Write fixtures**

```bash
mkdir -p test/fixtures/valid-config/.project-flow
mkdir -p test/fixtures/missing-config/.project-flow
```

Write `test/fixtures/valid-config/.project-flow/config.md`:

```markdown
# Project Flow Config

## Identity
- name: fixture-project
- family: standalone

## Branch convention
- feature: `feature/<slug>`

## Plugin mapping
- plan: superpowers:writing-plans
```

- [ ] **Step 3: Make test executable and run (expect failure)**

```bash
chmod +x test/cmd/test-validate-config.sh
```

Run: `bash test/run-all.sh`
Expected: FAIL (pf not yet implemented or binary missing)

- [ ] **Step 4: Implement the command**

Write `src/cli/commands/validate-config.ts`:

```typescript
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
		console.log(JSON.stringify({ ...result, hint }));
	} else {
		if (result.ok) console.log("config ok");
		for (const w of result.warnings) console.log(`warning: ${w}`);
		for (const e of result.errors) console.error(`error: ${e}`);
		if (hint) console.error(`hint: ${hint}`);
	}
}
```

- [ ] **Step 5: Wire into dispatcher**

Modify `src/cli/index.ts`, replace the switch body:

```typescript
import { validateConfig } from "./commands/validate-config.js";

// inside main():
switch (cmd) {
	case "validate-config":
		process.exit(validateConfig(args));
	case "context":
	case "start-feature":
	case "next-number":
		console.error(`not implemented: ${cmd}`);
		process.exit(1);
	default:
		console.error("usage: pf <context|start-feature|next-number|validate-config> [args]");
		process.exit(2);
}
```

- [ ] **Step 6: Build CLI**

Create first iteration of `scripts/build.js` (full build comes in Phase 6; here just enough to run tests):

```javascript
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
```

Run: `node scripts/build.js`
Expected: `built plugin/dist/pf.cjs and plugin/bin/pf`

- [ ] **Step 7: Run test to verify pass**

Run: `bash test/run-all.sh`
Expected: `pass`, passed: 1, failed: 0

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(cli): comando validate-config (TDD)"
```

### Task 3.5: Command — context (test first)

**Files:**
- Create: `test/cmd/test-context.sh`
- Add fixture: `test/fixtures/valid-config/.project-flow/features/demo/context.md`

- [ ] **Step 1: Write the failing test**

Write `test/cmd/test-context.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

PF="../plugin/bin/pf"

cd fixtures/valid-config
# init as git repo with a feature branch
git init -q -b main .
git config user.email "test@test"
git config user.name "test"
git commit --allow-empty -q -m "init"
git checkout -q -b feature/demo

# scaffold a fake feature dir so context recognizes it
mkdir -p .project-flow/features/demo
echo "# demo" > .project-flow/features/demo/context.md

out=$("$PF" context --json)

echo "$out" | grep -q '"feature":"demo"' || { echo "FAIL: expected feature:demo in $out"; exit 1; }
echo "$out" | grep -q '"project":"fixture-project"' || { echo "FAIL: expected project:fixture-project"; exit 1; }

# cleanup
git checkout -q main
rm -rf .git
rm -rf .project-flow/features

cd ../..
echo "  pass"
```

- [ ] **Step 2: Run test, expect failure**

Run: `bash test/run-all.sh`
Expected: FAIL (context not implemented)

- [ ] **Step 3: Implement context command**

Write `src/cli/commands/context.ts`:

```typescript
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseConfig } from "../lib/config.js";
import { currentBranch, extractSlug } from "../lib/git.js";
import { featureDir, resolveProjectContext } from "../lib/paths.js";

export function context(args: string[]): number {
	const json = args.includes("--json");
	const ctx = resolveProjectContext();

	if (!ctx.configExists) {
		emitError(json, "config.md not found", "run /project-flow:start-feature to scaffold");
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
```

- [ ] **Step 4: Wire into dispatcher**

Modify `src/cli/index.ts`:

```typescript
import { context } from "./commands/context.js";
// add in switch:
case "context":
	process.exit(context(args));
```

- [ ] **Step 5: Rebuild and test**

Run: `node scripts/build.js && bash test/run-all.sh`
Expected: passed: 2, failed: 0

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cli): comando context con detection feature da branch"
```

### Task 3.6: Command — next-number (test first)

**Files:**
- Create: `test/cmd/test-next-number.sh`

- [ ] **Step 1: Write the failing test**

Write `test/cmd/test-next-number.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

PF="../plugin/bin/pf"

cd fixtures/valid-config
mkdir -p .project-flow/features/demo/requirements
mkdir -p .project-flow/features/demo/plans

# empty dir → 001
out=$("$PF" next-number demo/requirements)
[ "$out" = "001" ] || { echo "FAIL: expected 001 on empty dir, got $out"; exit 1; }

# after creating 001 and 002 → next is 003
touch .project-flow/features/demo/requirements/001-a.md
touch .project-flow/features/demo/requirements/002-b.md
out=$("$PF" next-number demo/requirements)
[ "$out" = "003" ] || { echo "FAIL: expected 003 after two files, got $out"; exit 1; }

# different type still starts from 001
out=$("$PF" next-number demo/plans)
[ "$out" = "001" ] || { echo "FAIL: expected 001 for empty plans/, got $out"; exit 1; }

# cleanup
rm -rf .project-flow/features

cd ../..
echo "  pass"
```

- [ ] **Step 2: Run, expect failure**

Run: `bash test/run-all.sh`
Expected: FAIL

- [ ] **Step 3: Implement**

Write `src/cli/commands/next-number.ts`:

```typescript
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
```

- [ ] **Step 4: Wire into dispatcher**

Modify `src/cli/index.ts`:

```typescript
import { nextNumber } from "./commands/next-number.js";
// add:
case "next-number":
	process.exit(nextNumber(args));
```

- [ ] **Step 5: Rebuild and test**

Run: `node scripts/build.js && bash test/run-all.sh`
Expected: passed: 3

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cli): comando next-number con padding 3 cifre"
```

### Task 3.7: Command — start-feature (test first)

**Files:**
- Create: `test/cmd/test-start-feature.sh`

- [ ] **Step 1: Write the failing test**

Write `test/cmd/test-start-feature.sh`:

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

PF="../plugin/bin/pf"

cd fixtures/valid-config
git init -q -b main .
git config user.email "test@test"
git config user.name "test"
git commit --allow-empty -q -m "init"

# start-feature creates branch + dir structure
out=$("$PF" start-feature auth --branch feature/auth --json)

echo "$out" | grep -q '"slug":"auth"' || { echo "FAIL: expected slug:auth"; exit 1; }
[ -d .project-flow/features/auth ] || { echo "FAIL: feature dir missing"; exit 1; }
[ -f .project-flow/features/auth/context.md ] || { echo "FAIL: context.md missing"; exit 1; }
[ -d .project-flow/features/auth/requirements ] || { echo "FAIL: requirements/ missing"; exit 1; }
[ -d .project-flow/features/auth/plans ] || { echo "FAIL: plans/ missing"; exit 1; }

br=$(git branch --show-current)
[ "$br" = "feature/auth" ] || { echo "FAIL: expected branch feature/auth, got $br"; exit 1; }

# re-running on existing feature should warn, not duplicate
git checkout -q main
set +e
out2=$("$PF" start-feature auth --branch feature/auth --json)
code=$?
set -e
[ "$code" -eq 1 ] || { echo "FAIL: expected exit 1 on existing feature, got $code"; exit 1; }

# cleanup
rm -rf .git .project-flow/features

cd ../..
echo "  pass"
```

- [ ] **Step 2: Run, expect failure**

Run: `bash test/run-all.sh`
Expected: FAIL

- [ ] **Step 3: Implement**

Write `src/cli/commands/start-feature.ts`:

```typescript
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
```

- [ ] **Step 4: Wire into dispatcher**

Modify `src/cli/index.ts`:

```typescript
import { startFeature } from "./commands/start-feature.js";
// add:
case "start-feature":
	process.exit(startFeature(args));
```

- [ ] **Step 5: Rebuild and test**

Run: `node scripts/build.js && bash test/run-all.sh`
Expected: passed: 4

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(cli): comando start-feature con scaffold feature"
```

---

## Phase 4 — Skills (markdown, rewritten from scratch)

Each skill is independent. No dependencies between them. Skills don't require test runner (they'll be smoke-tested manually in phase 8).

### Task 4.1: Skill — man

**Files:**
- Create: `skills/man/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `skills/man/SKILL.md`:

```markdown
---
name: man
description: Show available claude-project-flow commands and usage. Pass a command name for detailed help.
---

# man

Display inline reference for claude-project-flow commands.

## Usage

- `/project-flow:man` — list all skills with one-line summary
- `/project-flow:man <skill>` — detailed help for a specific skill

## Behavior

When invoked without arguments, output this table:

| Command | Purpose |
|---------|---------|
| `/project-flow:start-feature <slug>` | Create branch + scaffold .project-flow/features/<slug>/ |
| `/project-flow:requirements` | Dialog to collect/update feature requirements |
| `/project-flow:plan` | Delegate to superpowers:writing-plans, save in plans/ |
| `/project-flow:close-feature` | Generate docs, mark feature closed, optional merge |
| `/project-flow:man [skill]` | This help |

When invoked with a skill argument, read the skill's own SKILL.md file from the plugin directory and print its full content.

## Implementation notes

Use the Read tool to fetch `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/SKILL.md` when a specific skill is requested. Never invent content — always pull from source.

Output in terminal, no file writes.
```

- [ ] **Step 2: Commit**

```bash
git add skills/man
git commit -m "feat(skills): skill man per reference inline"
```

### Task 4.2: Skill — start-feature

**Files:**
- Create: `skills/start-feature/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `skills/start-feature/SKILL.md`:

```markdown
---
name: start-feature
description: Initialize a new feature — create git branch and scaffold .project-flow/features/<slug>/ structure. Use when starting work on a new feature or user story.
---

# start-feature

Start a new feature in the current project. Creates git branch and scaffolds the feature directory.

## Usage

- `/project-flow:start-feature <slug>` — slug becomes both branch suffix (per config) and directory name

## Preconditions

1. The current directory is a git repo
2. `.project-flow/config.md` exists (if not, propose creating it first — see "Bootstrap" below)
3. Working tree is clean (or warn user)

## Procedure

1. **Read context**: run `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` to confirm project is recognized.
2. **Validate slug**: reject if contains spaces, uppercase letters, or special characters other than `-` and `_`.
3. **Ask for optional one-line description** (skip if user provides it upfront).
4. **Announce intent** (this is an irreversible action — ask for confirmation):
   > "I'll create branch `feature/<slug>` and scaffold `.project-flow/features/<slug>/`. Confirm?"
5. **Invoke CLI**: `${CLAUDE_PLUGIN_ROOT}/bin/pf start-feature <slug> --branch feature/<slug> --json`
6. **Parse output**: on success, extract `slug`, `branch`, `featureDir`.
7. **Suggest next step**: tell user to invoke `/project-flow:requirements` to collect initial requirements.

## Bootstrap case

If `pf context` returns `error: config.md not found`:
- Infer defaults: project name from git remote URL basename or current dir name; family=`standalone`; branch pattern=`feature/<slug>`
- Offer to write `.project-flow/config.md` using the template below
- Then retry the start-feature flow

### config.md template

```markdown
# Project Flow Config

## Identity
- name: <inferred>
- family: standalone                   # roadmapp | grc | vids | library | standalone
- stack: <stack if known>
- description: <one line, optional>

## Branch convention
- feature: `feature/<slug>`
# - us: `US-<n>-<slug>`                # enable if family=grc
# - fix: `fix/<slug>`

## Folder layout
# features_dir: .project-flow/features
# decisions_dir: docs/adr
# design_dir: design/mockups

## Plugin mapping
- plan: superpowers:writing-plans
- brainstorm: superpowers:brainstorming
- tdd: superpowers:test-driven-development
- review: superpowers:requesting-code-review

## Workflow rules
- cross_review: suggested              # suggested | required | off
- scope_audit: off                     # v1.1
- announce_default: hybrid             # hybrid | always-confirm | always-proceed

## Glossary
# - "user story" → requirements
# - "spike" → research
```

Also scaffold `.project-flow/context.md` with:

```markdown
---
project: <inferred name>
created_at: YYYY-MM-DD
---

# Project context

## Active feature
_(none yet)_

## Cross-feature decisions
_(ADRs land here or in decisions/ — see config.md folder layout)_

## Notes
_(free-form project-level notes)_
```

## Announcement template (verbatim)

```
Creating feature "<slug>":
- branch: feature/<slug>
- dir: .project-flow/features/<slug>/

Proceed? (y/N)
```

## On error

- Feature already exists: show warning, offer `git checkout feature/<slug>` as alternative
- Git checkout failed: show error from CLI, suggest `git status` to debug

## Output

Keep terminal output brief. Link to feature dir for reference.
```

- [ ] **Step 2: Commit**

```bash
git add skills/start-feature
git commit -m "feat(skills): skill start-feature"
```

### Task 4.3: Skill — requirements

**Files:**
- Create: `skills/requirements/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `skills/requirements/SKILL.md`:

```markdown
---
name: requirements
description: Collect or update feature requirements through structured dialog. Creates numbered file in .project-flow/features/<slug>/requirements/ and appends entry to context.md.
---

# requirements

Dialog-driven requirements collection for the currently active feature.

## Usage

- `/project-flow:requirements` — starts new requirements dialog (initial if first, addendum if subsequent)

## Preconditions

1. A feature is active: `pf context --json` returns non-null `feature`. If null, instruct user to invoke `/project-flow:start-feature` first.

## Procedure

1. **Resolve context**: `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` → read `feature`, `feature_dir`
2. **Check for recent brainstorm**: look in current chat for a recent `/superpowers:brainstorming` output or in `<feature_dir>/../../shared/brainstorm-*.md`. If found, ask:
   > "I see a brainstorm output. Use it as input for requirements?"
3. **Determine label**: if directory `requirements/` is empty → label is `initial`. Otherwise → ask user for a short slug for the addendum (e.g. `security`, `2fa`, `perf`).
4. **Conduct dialog**: collect purpose → scope → constraints → acceptance criteria. One topic at a time. Prefer multiple choice when possible.
5. **Get next number**: `${CLAUDE_PLUGIN_ROOT}/bin/pf next-number <slug>/requirements` → e.g. `002`
6. **Synthesize markdown**: produce final file content using the template below
7. **Announce intent (reversible action, proceed with announcement)**:
   > "Saving requirements to `<feature_dir>/requirements/NNN-<label>.md`"
8. **Write file** using Write tool
9. **Update context.md**: append line under `## Requirements updates` section — e.g. `- YYYY-MM-DD — 002 addendum (security)`

## Template

```markdown
---
created_at: YYYY-MM-DD
label: <label>
---

# Requirements: <label>

## Purpose
<one paragraph on what this feature achieves>

## Scope
<what's in, what's out>

## Constraints
<technical, business, or timeline>

## Acceptance criteria
- [ ] criterion 1
- [ ] criterion 2
```

## Dialog principles

- One question at a time
- Stop when you have >= 80% confidence the requirement is implementable
- If the user is unclear, propose 2-3 alternatives
- No YAGNI: if the user asks for "also X", ask if it's v1 or later

## Output

Brief summary in chat, link to the file written.
```

- [ ] **Step 2: Commit**

```bash
git add skills/requirements
git commit -m "feat(skills): skill requirements con dialogo strutturato"
```

### Task 4.4: Skill — plan

**Files:**
- Create: `skills/plan/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `skills/plan/SKILL.md`:

```markdown
---
name: plan
description: Create an implementation plan for the active feature. Delegates to superpowers:writing-plans when installed, falls back to inline dialog otherwise. Saves to .project-flow/features/<slug>/plans/NNN-<scope>.md
---

# plan

Produce an implementation plan for the active feature.

## Usage

- `/project-flow:plan` — create a new plan (optionally ask scope: API, UI, DB, etc.)

## Preconditions

1. An active feature (`pf context --json` → `feature != null`)
2. At least one requirements file exists in `<feature_dir>/requirements/`

## Procedure

1. **Resolve context**: `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` → feature, plugins mapping
2. **Ask scope** (short label, e.g. `api`, `ui`, `migration`). This becomes the filename slug.
3. **Load requirements**: read all files in `<feature_dir>/requirements/`, concatenate as context
4. **Get next number**: `pf next-number <slug>/plans` → e.g. `003`
5. **Determine target path**: `<feature_dir>/plans/NNN-<scope>.md`
6. **Detect superpowers**: check if `superpowers:writing-plans` is available. Check `config.md` `plugins.plan` for mapping.
7. **Announce intent (reversible, proceed with announcement)**:
   > "Using superpowers:writing-plans. Output will be saved to `<target_path>`. Proceeding."
8. **Invoke the mapped plan skill**: pass requirements as context
9. **Intercept output**: when the plan skill finishes, capture its output (should be a markdown plan)
10. **Save to target path** using Write tool (NOT to the default superpowers path)
11. **Update context.md**: append line under `## Plans` — e.g. `- YYYY-MM-DD — 003 (scope: api)`

## If superpowers is not installed

Fall back to inline dialog following writing-plans principles:
- Ask for goal, architecture sketch
- Break into bite-sized tasks (2-5 min each)
- Apply TDD pattern where applicable
- Save to same target path

## Post-conditions

- File `<feature_dir>/plans/NNN-<scope>.md` exists
- `context.md` updated

## Output

Path to plan file + brief summary of plan structure.
```

- [ ] **Step 2: Commit**

```bash
git add skills/plan
git commit -m "feat(skills): skill plan con delega a superpowers:writing-plans"
```

### Task 4.5: Skill — close-feature

**Files:**
- Create: `skills/close-feature/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

Write `skills/close-feature/SKILL.md`:

```markdown
---
name: close-feature
description: Close the active feature — generate final docs (overview, implementation, edge-cases), optionally merge branch, mark status=closed in context.md.
---

# close-feature

Finalize a feature: generate documentation, optionally merge, archive.

## Usage

- `/project-flow:close-feature` — runs on the currently active feature

## Preconditions

1. Active feature (`pf context --json` → `feature != null`)
2. Git status clean (uncommitted changes → warn, offer to commit first)

## Procedure

### Part A — docs generation

1. **Gather data**: read `context.md`, all `requirements/*`, all `plans/*`, `git log` since branch created
2. **Dialog to enrich**: ask user:
   - What were the key design decisions?
   - Any notable edge cases handled?
   - Anything that changed vs original plan?
3. **Synthesize three docs** using Write tool:
   - `<feature_dir>/docs/overview.md` — what this feature does, why it exists
   - `<feature_dir>/docs/implementation.md` — how it was built, key files, patterns
   - `<feature_dir>/docs/edge-cases.md` — edge cases handled, known limitations
4. Create docs/ directory if it doesn't exist

### Part B — merge decision

Ask user which option:

1. **Merge to main now** (this session handles merge)
2. **Open PR** (runs `gh pr create` if gh is installed)
3. **Just close, merge later** (manual merge by user)
4. **Abort merge, just generate docs**

For option 1 or 2: **announce irreversible action, ask confirmation**:
> "Ready to merge feature/<slug> to main. Confirm? (y/N)"

If confirmed, execute via git commands or gh.

### Part C — mark closed

Update `<feature_dir>/context.md` frontmatter:
```
status: closed
closed_at: YYYY-MM-DD
```

Append under `## Sessions`:
- `YYYY-MM-DD — feature closed`

## Templates

### overview.md

```markdown
# Overview: <slug>

## Purpose
<one paragraph: what this feature achieves, for whom>

## Scope
<what it does and doesn't do>

## User-facing summary
<plain language, no jargon>
```

### implementation.md

```markdown
# Implementation: <slug>

## Architecture
<2-3 paragraphs describing approach>

## Key files
- `path/file1.ts` — <role>
- `path/file2.ts` — <role>

## Patterns used
<design patterns, conventions followed>

## Dependencies added
<new libraries, external services>
```

### edge-cases.md

```markdown
# Edge cases: <slug>

## Handled
- <case 1>: <mitigation>
- <case 2>: <mitigation>

## Known limitations
<what's explicitly not covered>

## Future considerations
<items for v2 or later>
```

## Output

Summary of docs created + merge outcome + path to context.md for final status check.
```

- [ ] **Step 2: Commit**

```bash
git add skills/close-feature
git commit -m "feat(skills): skill close-feature con generazione docs + merge"
```

---

## Phase 5 — Hook and manifests

### Task 5.1: Hook file (lean SessionStart)

**Files:**
- Create: `hooks/hooks.json`

- [ ] **Step 1: Write hook config**

Write `hooks/hooks.json`:

```json
{
	"description": "claude-project-flow session startup check",
	"hooks": {
		"SessionStart": [
			{
				"matcher": "startup",
				"hooks": [
					{
						"type": "command",
						"command": "_R=\"${CLAUDE_PLUGIN_ROOT}\"; [ -f \"$_R/bin/pf\" ] && \"$_R/bin/pf\" validate-config 2>&1 || true",
						"timeout": 5
					}
				]
			}
		]
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks
git commit -m "feat(hooks): hook SessionStart leggero per validate-config"
```

### Task 5.2: Plugin manifest (root)

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Write plugin.json**

Write `.claude-plugin/plugin.json`:

```json
{
	"name": "claude-project-flow",
	"version": "0.2.0",
	"description": "Per-project workflow orchestrator: feature lifecycle, requirements, plans, docs — filesystem-only markdown.",
	"author": {
		"name": "Matteo Visca"
	},
	"repository": "https://github.com/matteovisca/claude-project-flow",
	"license": "MIT",
	"keywords": ["claude", "claude-code", "plugin", "workflow", "feature-lifecycle"]
}
```

- [ ] **Step 2: Update marketplace.json**

Read current `.claude-plugin/marketplace.json`, set the version for claude-project-flow plugin to `0.2.0`, preserve the rest.

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin
git commit -m "chore: bump version 0.2.0 e descrizione aggiornata"
```

### Task 5.3: Plugin manifest (dist)

**Files:**
- Create: `plugin/.claude-plugin/plugin.json` (mirror of root, regenerated by build)

- [ ] **Step 1: Create plugin/.claude-plugin/ and copy manifest**

```bash
mkdir -p plugin/.claude-plugin
cp .claude-plugin/plugin.json plugin/.claude-plugin/plugin.json
```

- [ ] **Step 2: Verify**

Run: `cat plugin/.claude-plugin/plugin.json | grep version`
Expected: `"version": "0.2.0"`

- [ ] **Step 3: Commit**

```bash
git add plugin/.claude-plugin
git commit -m "chore: plugin/.claude-plugin/plugin.json sincronizzato"
```

---

## Phase 6 — Full build pipeline

### Task 6.1: Complete build script

**Files:**
- Modify: `scripts/build.js`

- [ ] **Step 1: Expand build script to include skills + hooks + manifest sync**

Write `scripts/build.js` (full version):

```javascript
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
```

- [ ] **Step 2: Run full build**

Run: `node scripts/build.js`
Expected output ends with `Build complete.` and no errors.

- [ ] **Step 3: Run all tests**

Run: `bash test/run-all.sh`
Expected: passed: 4, failed: 0

- [ ] **Step 4: Commit**

```bash
git add scripts/build.js
git commit -m "chore(build): pipeline completa (CLI + skills + hooks + manifest)"
```

---

## Phase 7 — Documentation

### Task 7.1: Rewrite README.md

**Files:**
- Modify: `README.md` (full rewrite, remove references to DB/dashboard/MCP)

- [ ] **Step 1: Write README**

Write `README.md`:

```markdown
# claude-project-flow

Per-project workflow orchestrator plugin for Claude Code. Filesystem-only, versioned with git, no DB, no MCP, no dashboard.

## What it does

Manages feature lifecycle for a single project: create feature branch + scaffold folder, collect requirements, create plans (delegating to installed plugins like `superpowers`), generate final docs, close feature.

All state lives in `.project-flow/` inside your project repo, as markdown files you can read and edit by hand.

## Installation

```bash
claude plugin install matteovisca/claude-project-flow
```

## Quick start

```bash
cd your-project
# First time setup:
/project-flow:start-feature export-csv
# → creates branch feature/export-csv + .project-flow/features/export-csv/

/project-flow:requirements
# → dialog → saves requirements/001-initial.md

/project-flow:plan
# → delegates to superpowers:writing-plans → plans/001-export-csv.md

# ... implement ...

/project-flow:close-feature
# → generates docs/overview.md + implementation.md + edge-cases.md
# → optionally merges branch
```

## Commands

| Command | Purpose |
|---------|---------|
| `/project-flow:start-feature <slug>` | New feature: branch + folder scaffold |
| `/project-flow:requirements` | Collect/update requirements via dialog |
| `/project-flow:plan` | Create implementation plan (delegates to superpowers if installed) |
| `/project-flow:close-feature` | Generate docs + optional merge + mark closed |
| `/project-flow:man [skill]` | Inline reference |

## Folder structure

```
your-project/
└── .project-flow/
    ├── config.md                   ← per-project adaptation
    ├── context.md                  ← cross-feature living state
    └── features/
        └── <slug>/
            ├── context.md
            ├── requirements/       ← NNN-*.md
            ├── plans/              ← NNN-*.md
            ├── research/           ← on-demand
            ├── design/             ← on-demand
            └── docs/               ← generated at close
```

## Configuration

On first `/project-flow:start-feature`, a default `.project-flow/config.md` is created. Edit to customize:

- Branch conventions (e.g. `feature/<slug>` vs `US-<n>-<slug>`)
- Folder layout overrides (if you already have `docs/adr/` etc.)
- Plugin mapping (`plan: superpowers:writing-plans` by default — change per project)
- Workflow rules (announce default, cross-review policy)

## External dependencies

The plugin itself has **zero runtime dependencies** (only Node.js ≥18). Optional external plugins can be invoked for specific scopes — configured via `config.md`:

- `superpowers:writing-plans` — recommended for `/project-flow:plan`
- `superpowers:test-driven-development` — optional, manifesto-style
- `codex:rescue` — v2, cross-review

If a mapped plugin isn't installed, the session-start hook warns (non-blocking).

## Philosophy

- **Per-project**: scope limited to one project, not a cross-project knowledge manager
- **Filesystem-only**: markdown + git. Anything more (DB, MCP, dashboard) was overkill in previous versions
- **Delegate, don't reinvent**: leverage ecosystem plugins for specialized phases
- **Announce, never magic**: every routing to an external plugin is announced before invocation

## Status

v0.2.0 — MVP. See [docs/superpowers/specs/](docs/superpowers/specs/) for design and [docs/superpowers/plans/](docs/superpowers/plans/) for implementation plan.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: riscrittura README per v0.2.0"
```

### Task 7.2: UPSTREAM.md (superpowers watch policy)

**Files:**
- Create: `docs/UPSTREAM.md`

- [ ] **Step 1: Write UPSTREAM.md**

Write `docs/UPSTREAM.md`:

```markdown
# Upstream watch policy

claude-project-flow delegates certain scopes to external plugins. The most-used one is `obra/superpowers`. Since superpowers has had documented flip-flops between minor releases (see their RELEASE-NOTES), we maintain a minimal watch policy to decide when to adopt upstream changes.

## Scope

This document tracks **only the skills we delegate to** — not the entire superpowers plugin.

Currently delegated:
- `superpowers:writing-plans` (from `/project-flow:plan`)
- `superpowers:test-driven-development` (optional, via config mapping)
- `superpowers:brainstorming` (manual user invocation, not our routing)

## Check cadence

- On each minor release of superpowers, review diff
- Never blindly merge — evaluate each change against our flow

## Adoption criteria

Adopt a change from upstream only if it satisfies ALL of:
1. It solves a concrete problem we have observed
2. It does not conflict with our file paths (`.project-flow/...` vs their `docs/superpowers/...`)
3. It does not add a hard gate that breaks our workflow
4. The change is stable (not reverted in subsequent minor)

Do NOT adopt just because "it's newer" or "it looks nice".

## Checked versions

| superpowers version | Date checked | Adopted | Notes |
|---|---|---|---|
| 5.0.7 | 2026-04-21 | n/a | Initial assessment during v0.2.0 design |

Keep this table updated on each check.
```

- [ ] **Step 2: Commit**

```bash
git add docs/UPSTREAM.md
git commit -m "docs: upstream watch policy per delega a superpowers"
```

### Task 7.3: THIRD-PARTY-NOTICES.md

**Files:**
- Create: `THIRD-PARTY-NOTICES.md`

- [ ] **Step 1: Write THIRD-PARTY-NOTICES**

Write `THIRD-PARTY-NOTICES.md`:

```markdown
# Third-party notices

## Delegated plugins

claude-project-flow does not bundle any third-party code. It invokes other plugins at runtime if installed:

### obra/superpowers

- License: MIT
- Source: https://github.com/obra/superpowers
- Usage: optional delegation target for `/project-flow:plan` and other scopes via `.project-flow/config.md` mapping
- No code from superpowers is included in this repository

### codex (v2+)

- Source: https://github.com/openai/codex (or current fork)
- Usage: planned cross-review delegation in future versions

## Development inspiration

Design patterns and checklist structure were influenced by reading (but not copying code from):

- [obra/superpowers](https://github.com/obra/superpowers) — skill structure, TDD discipline
- [GitHub Spec-kit](https://github.com/github/spec-kit) — spec-first folder conventions
- [kiro.dev](https://kiro.dev/) — steering-docs triad
```

- [ ] **Step 2: Commit**

```bash
git add THIRD-PARTY-NOTICES.md
git commit -m "docs: third-party notices per trasparenza dipendenze esterne"
```

---

## Phase 8 — Smoke test end-to-end

No TDD here — manual validation that the plugin works in a real Claude Code session.

### Task 8.1: Local install

**Files:**
- Runtime only (plugin installed to `~/.claude/plugins/cache/`)

- [ ] **Step 1: Build fresh**

Run: `npm run build`
Expected: `Build complete.`

- [ ] **Step 2: Deploy to local cache manually**

```bash
PLUGIN_CACHE="$HOME/.claude/plugins/cache/matteovisca/claude-project-flow/0.2.0"
mkdir -p "$PLUGIN_CACHE"
rm -rf "$PLUGIN_CACHE"/*
cp -r plugin/* "$PLUGIN_CACHE/"
```

- [ ] **Step 3: Verify files present**

Run: `ls "$PLUGIN_CACHE"/`
Expected: `bin`, `dist`, `hooks`, `skills`, `.claude-plugin`

- [ ] **Step 4: Restart Claude Code to pick up the plugin**

Manual step. Start a new session in a test project.

### Task 8.2: Manual flow validation

**Files:**
- Test project: `/tmp/pf-test` (or chosen location)

- [ ] **Step 1: Create test project**

```bash
mkdir /tmp/pf-test
cd /tmp/pf-test
git init -b main
git commit --allow-empty -m "init"
```

Open in Claude Code.

- [ ] **Step 2: Scaffold first feature**

In chat: `/project-flow:start-feature demo`

Expected:
- Claude asks confirmation
- After confirm, runs `pf start-feature`
- Branch `feature/demo` created, `.project-flow/features/demo/` exists with `context.md`, `requirements/`, `plans/`
- Config file also generated if not present

- [ ] **Step 3: Collect requirements**

In chat: `/project-flow:requirements`

Expected:
- Dialog starts, asks purpose/scope/constraints/AC
- Ends writing `.project-flow/features/demo/requirements/001-initial.md`
- `context.md` updated with requirements log line

- [ ] **Step 4: Create plan**

In chat: `/project-flow:plan`

Expected:
- Announces use of superpowers:writing-plans (if installed)
- Output saved in `.project-flow/features/demo/plans/001-<scope>.md`
- `context.md` updated

- [ ] **Step 5: Close feature**

In chat: `/project-flow:close-feature`

Expected:
- Dialog for key decisions/edge cases
- Creates `docs/overview.md`, `docs/implementation.md`, `docs/edge-cases.md`
- Asks merge option, handles accordingly
- `context.md` frontmatter → `status: closed`

- [ ] **Step 6: Check man**

In chat: `/project-flow:man`

Expected: table of commands

In chat: `/project-flow:man plan`

Expected: full content of skills/plan/SKILL.md

- [ ] **Step 7: Document findings**

Create a quick note `docs/superpowers/plans/2026-04-21-smoke-test-results.md` listing:
- What worked
- What didn't (file a fix issue or hotfix)
- Overall verdict

- [ ] **Step 8: Final commit on this branch**

```bash
git add docs/
git commit -m "docs: risultati smoke test v0.2.0"
```

### Task 8.3: Merge to main (optional, final)

**Files:**
- Git metadata

- [ ] **Step 1: Verify all tests pass**

Run: `npm run build && npm test`
Expected: `passed: 4, failed: 0`

- [ ] **Step 2: Merge strategy decision**

This is a user decision: fast-forward vs squash vs PR. Present options via `superpowers:finishing-a-development-branch` if installed.

- [ ] **Step 3: After merge, optionally tag**

```bash
git tag -a v0.2.0 -m "claude-project-flow 0.2.0 — per-project workflow orchestrator"
```

---

## Summary

Total tasks: 27 across 8 phases. Estimated time: 1-2 working days for a focused session.

Key invariants to preserve during execution:
- CLI stays **<200 LOC** (current estimate from design: ~180 LOC)
- Zero runtime NPM dependencies in the plugin
- No DB, no MCP, no dashboard
- Every external plugin invocation is announced to the user first
- File paths in `.project-flow/` are deterministic (no date-based naming from LLM)
