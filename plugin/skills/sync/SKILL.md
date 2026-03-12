---
name: sync
description: Synchronize docs directory with git remote, reconcile local DB, and push changes
---

# Sync

Synchronize the documentation directory with git remote and reconcile the local DB.

## Parameters
- `<command>` — Sub-command: `pull`, `push`, `status`, or empty for full sync

## Usage
- `/claude-project-flow:sync` — Full flow: pull → reconcile DB → push
- `/claude-project-flow:sync pull` — Git pull + DB reconciliation
- `/claude-project-flow:sync push` — Commit + push local changes
- `/claude-project-flow:sync status` — Show sync status and DB differences

## Execution

This skill delegates to the `sync.cjs` script for all operations. The script handles git commands, markdown parsing, and DB updates autonomously.

### Step 1: Determine script path

The sync script is at:
```
${CLAUDE_PLUGIN_ROOT}/scripts/dist/sync.cjs
```

If `CLAUDE_PLUGIN_ROOT` is not set, fall back to the plugin directory relative to the skill.

### Step 2: Run the script

Execute the sync script with `--json` flag to get structured output:

```bash
node "<script_path>" <command> --json
```

Where `<command>` is:
- Empty or `all` — full sync (pull → reconcile → push)
- `pull` — git pull + reconcile DB from files
- `push` — commit with summary + git push
- `status` — show current sync state

### Step 3: Present results

Parse the JSON output and present to the user in a readable format:

#### For `pull`:
> **📥 Pull completato**
> - Git: <pull output summary>
> - DB aggiornato: <N> progetti, <N> feature create, <N> aggiornate
> - Feature rimosse dal remote: <list if any>

#### For `push`:
> **📤 Push completato**
> - Commit: `<commit message>`
> - Push: <success/failure>

#### For `status`:
> **📊 Stato sincronizzazione**
> - Repository git: sì/no
> - Remote: configurato/non configurato
> - Modifiche locali: <N> file
> - Dietro al remote: sì/no
> - Avanti rispetto al remote: sì/no
> - Differenze DB: <list>

#### For `all` (full sync):
> **🔄 Sync completato**
> - Pull: <summary>
> - Reconcile: <summary>
> - Push: <summary>

### Step 4: Handle errors

If the script returns an error (exit code 1), present the error message and suggest corrective action:

- **Conflicts detected**: Tell the user to resolve conflicts manually, then run `/sync` again
- **No remote configured**: Suggest configuring a git remote on the docs directory
- **Not a git repo**: Suggest initializing git in the docs directory
- **Docs path not configured**: Suggest running `/claude-project-flow:setup`
