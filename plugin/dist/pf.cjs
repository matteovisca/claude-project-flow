#!/usr/bin/env node
"use strict";

// src/cli/commands/validate-config.ts
var import_node_path2 = require("node:path");

// src/cli/lib/config.ts
var import_node_fs = require("node:fs");
function parseConfig(path) {
  const raw = (0, import_node_fs.readFileSync)(path, "utf-8");
  const config = {};
  const lines = raw.split(/\r?\n/);
  let section = null;
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
    const match = body.match(/^([a-zA-Z0-9_.-]+):\s*(.+?)(?:\s+#.*)?$/);
    if (!match) continue;
    const [, key, valueRaw] = match;
    const value = valueRaw.replace(/^`|`$/g, "").trim();
    applySection(config, section, key, value);
  }
  return config;
}
function applySection(config, section, key, value) {
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
function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// src/cli/lib/paths.ts
var import_node_fs2 = require("node:fs");
var import_node_path = require("node:path");
function resolveProjectContext(cwd = process.cwd()) {
  const projectRoot = findProjectRoot(cwd);
  const projectFlowDir = (0, import_node_path.join)(projectRoot, ".project-flow");
  return {
    projectRoot,
    projectFlowDir,
    configExists: (0, import_node_fs2.existsSync)((0, import_node_path.join)(projectFlowDir, "config.md")),
    contextExists: (0, import_node_fs2.existsSync)((0, import_node_path.join)(projectFlowDir, "context.md"))
  };
}
function findProjectRoot(start) {
  let dir = (0, import_node_path.resolve)(start);
  while (true) {
    if ((0, import_node_fs2.existsSync)((0, import_node_path.join)(dir, ".git"))) return dir;
    const parent = (0, import_node_path.resolve)(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return (0, import_node_path.resolve)(start);
}
function featureDir(projectFlowDir, slug) {
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw new Error(`invalid slug: ${slug}`);
  }
  return (0, import_node_path.join)(projectFlowDir, "features", slug);
}

// src/cli/commands/validate-config.ts
function validateConfig(args2) {
  const json = args2.includes("--json");
  const ctx = resolveProjectContext();
  const result = { ok: true, warnings: [], errors: [] };
  if (!ctx.configExists) {
    result.ok = false;
    result.errors.push("config.md not found at .project-flow/config.md");
    emit(result, json, "no config \u2014 run /project-flow:start-feature to scaffold");
    return 2;
  }
  try {
    const parsed = parseConfig((0, import_node_path2.join)(ctx.projectFlowDir, "config.md"));
    if (!parsed.identity?.name) result.warnings.push("missing Identity.name");
    if (!parsed.branch?.feature) result.warnings.push("missing Branch.feature");
    if (result.errors.length > 0) result.ok = false;
  } catch (e) {
    result.ok = false;
    result.errors.push(`parse error: ${e.message}`);
    emit(result, json, "check config.md syntax");
    return 2;
  }
  emit(result, json);
  return result.ok ? 0 : 1;
}
function emit(result, json, hint) {
  if (json) {
    console.log(JSON.stringify({ ...result, hint }));
  } else {
    if (result.ok) console.log("config ok");
    for (const w of result.warnings) console.log(`warning: ${w}`);
    for (const e of result.errors) console.error(`error: ${e}`);
    if (hint) console.error(`hint: ${hint}`);
  }
}

// src/cli/commands/context.ts
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// src/cli/lib/git.ts
var import_node_child_process = require("node:child_process");
function currentBranch(cwd) {
  try {
    const out = (0, import_node_child_process.execSync)("git branch --show-current", { cwd, encoding: "utf-8" });
    return out.trim() || null;
  } catch {
    return null;
  }
}
function extractSlug(branch, pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/<slug>/g, "([A-Za-z0-9_-]+)");
  const re = new RegExp(`^${escaped}$`);
  const m = branch.match(re);
  return m?.[1] ?? null;
}

// src/cli/commands/context.ts
function context(args2) {
  const json = args2.includes("--json");
  const ctx = resolveProjectContext();
  if (!ctx.configExists) {
    emitError(json, "config.md not found", "run /project-flow:start-feature to scaffold");
    return 2;
  }
  const parsed = parseConfig((0, import_node_path3.join)(ctx.projectFlowDir, "config.md"));
  const branch = currentBranch(ctx.projectRoot);
  let feature = null;
  if (branch && parsed.branch?.feature) {
    feature = extractSlug(branch, parsed.branch.feature);
  }
  const result = {
    project: parsed.identity?.name ?? null,
    family: parsed.identity?.family ?? null,
    branch,
    feature,
    feature_dir: feature && (0, import_node_fs3.existsSync)(featureDir(ctx.projectFlowDir, feature)) ? featureDir(ctx.projectFlowDir, feature) : null,
    plugins: parsed.plugins ?? {},
    announce: parsed.workflow?.announceDefault ?? "hybrid"
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
function emitError(json, error, hint) {
  if (json) console.log(JSON.stringify({ error, hint }));
  else {
    console.error(`error: ${error}`);
    console.error(`hint: ${hint}`);
  }
}

// src/cli/index.ts
var cmd = process.argv[2];
var args = process.argv.slice(3);
async function main() {
  switch (cmd) {
    case "validate-config":
      process.exit(validateConfig(args));
    case "context":
      process.exit(context(args));
    case "start-feature":
    case "next-number":
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
