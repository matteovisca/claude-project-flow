---
name: setup-permissions
description: Configure all required permissions for the claude-project-flow plugin in one step
---

# Setup Permissions

Authorize all plugin commands in one step — lists required permissions and writes them to settings.

## Parameters
- `<target>` — Where to save: `project` (default) or `global`

## Usage
- `/setup-permissions` — Apply to current project
- `/setup-permissions global` — Apply globally

## Execution

### Step 1: Show permissions

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/setup-permissions.cjs" list --json
```

Present script CLI and MCP tool permissions with totals.

### Step 2: Apply

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/setup-permissions.cjs" apply \
  --target=<target> --project-dir="<cwd>" --json
```

### Step 3: Report

> **Permessi configurati**
> - Target: `<settings path>`
> - Aggiunti: N nuovi
> - Già presenti: N (saltati)
>
> Riavvia Claude Code per applicare le modifiche.
