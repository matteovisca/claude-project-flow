---
name: setup-permissions
description: Configure all required permissions for the claude-project-flow plugin in one step
---

# Setup Permissions

Authorize all plugin commands in one step — lists required permissions and writes them to `.claude/settings.json`.

## Parameters
- `<target>` — Where to save: `project` (default, current project) or `global` (~/.claude/settings.json)

## Usage
- `/claude-project-flow:setup-permissions` — List and apply permissions for current project
- `/claude-project-flow:setup-permissions global` — Apply permissions globally

## Execution

### Step 1: Determine script path

```
${CLAUDE_PLUGIN_ROOT}/scripts/dist/setup-permissions.cjs
```

### Step 2: Show current permissions

Run the script in list mode:

```bash
node "<script_path>" list --json
```

Parse the JSON output and present to the user:

> **🔐 Permessi richiesti da claude-project-flow**
>
> **Script CLI** (N):
> - `Bash(node ".../sync.cjs")`
> - `Bash(node ".../man.cjs")`
> - ...
>
> **MCP Tools** (N):
> - `mcp__plugin_claude-project-flow_project-flow__feature_get`
> - ...
>
> **Totale: N permessi**
>
> Vuoi applicarli al progetto corrente o globalmente?

### Step 3: Apply permissions

After user confirms, determine the target:
- If user says `global` or the parameter is `global`: use `--target=global`
- Otherwise: use `--project-dir=<current working directory>`

```bash
node "<script_path>" apply --target=<target> --project-dir="<cwd>" --json
```

### Step 4: Present results

Parse the JSON output:

> **✅ Permessi configurati**
> - Target: `<settings path>`
> - Aggiunti: N nuovi permessi
> - Già presenti: N (saltati)
>
> Riavvia Claude Code per applicare le modifiche.

### Step 5: Handle errors

- **Plugin non installato**: Suggerisci di installare il plugin dal marketplace
- **Nessun progetto specificato**: Suggerisci di specificare `--project-dir` o usare `global`
