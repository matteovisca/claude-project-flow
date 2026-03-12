---
name: session-save
description: Sync development progress with feature — update requirements, plan steps, and session log in DB
---

# Session Save

Analyze the current session's work and sync feature state in the DB.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Pre-processing scripts

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" log 20 --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" diff <merge-base> --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/context-loader.cjs" <feature> --json
```

## Step 1: Resolve feature

1. Detect project and feature
2. Call `feature_get` to load current state (definition, session_log, plans_status, requirements_status)
3. Call `feature_document_list` to see existing documents

## Step 2: Gather session diff

From `git-ops.cjs` output, build a session delta: files changed, commits, semantic understanding.

## Step 3: Analyze coverage

### Plan progress
Read active plan documents via `feature_document_read`. Match git changes to plan steps.
Present progress and ask user to confirm.

### Requirements impact
Compare changes against requirements document. Identify fulfilled, new implicit, and invalidated requirements.

### Unplanned work
Identify changes not mapping to any requirement or plan step.

## Step 4: Apply updates

### Plans
Update plan document checkboxes via `feature_document_write`.
Update `plans_status` JSON via `feature_update`.

### Requirements
If user confirms: update requirements document via `feature_document_write`.
Update `requirements_status` JSON via `feature_update`.

### Session log
Append session entry to feature's `session_log` field via `feature_update`:

```markdown
## Session: <date>
### Summary
...
### Commits
...
### Requirements addressed
...
### Plan steps completed
...
### Open items for next session
...
```

## Step 5: Update feature status

Based on progress:
- All plan steps done → `implementation-done`
- Some done → `in-progress`

Call `feature_update` with new status.

## Step 6: Report

> **Session salvata per {name}**
> - Piano: X/Y step completati
> - Requisiti: N coperti
> - Status: `{status}`
>
> **Prossima sessione:** {open items}
