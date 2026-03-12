---
name: feature-merge
description: Merge a completed feature branch into main, update DB status
---

# Feature Merge

Merge a feature branch into the main branch, verify consistency, and mark as implemented.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Pre-processing scripts

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" merge-check <main> --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" branch-info --json
```

## Step 1: Resolve feature

1. Detect project and feature
2. Call `feature_get` to verify state
3. Determine main branch (`main`, `master`, or `develop`)

## Step 2: Pre-merge checks

### Completeness
- Check `requirements_status` and `plans_status` from feature
- If docs missing, offer to run `/feature-docs` first
- Warn on incomplete requirements/plans but allow proceeding

### Working tree
- `git status --short` — must be clean

### Branch
- Verify on feature branch, offer to switch if not

## Step 3: Pull and forward merge

```bash
git fetch origin
git merge <main>
```

If conflicts: show files, help resolve or ask to re-invoke after resolution.

## Step 4: Verify final delta

Show `git diff <main>..HEAD --stat` summary. Ask for confirmation.

## Step 5: Merge into main

```bash
git checkout <main>
git merge feature/<name>
```

**Do NOT push** — inform user to push when ready.

## Step 6: Update DB

Call `feature_update` with status: `implemented`.

## Step 7: Cleanup

Ask about deleting the feature branch. If yes: `git branch -d feature/<name>`

## Step 8: Report

> **Feature merge completato: {name}**
> - Branch: `feature/<name>` → `<main>`
> - Status: `implemented`
> - Branch feature: eliminato / mantenuto
>
> Il push non è stato eseguito: `git push origin <main>`
