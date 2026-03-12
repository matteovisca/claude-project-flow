---
name: feature-init
description: Initialize a new feature — create branch, register in DB with definition
---

# Feature Init

Initialize a new feature for the current project. Everything is stored in the SQLite database.

## Parameters
- `$ARGUMENTS` — Feature name (optional, asked interactively)

## Step 1: Detect project

- Get project name from git root basename
- Check registration via `feature_list` or `project_list`
  - If not registered, suggest `/claude-project-flow:project-init` first
- Get current branch

## Step 2: Branch

> Vuoi lavorare sul branch corrente (`<branch>`) o crearne uno nuovo?
> 1. Usa il branch corrente
> 2. Crea un nuovo branch

If new branch:
- Propose `feature/$ARGUMENTS`
- If uncommitted changes, ask: carry over or commit first
- `git checkout -b feature/<name>`

## Step 3: Feature name and description

- Ask for feature name if not provided
- Ask for a brief description (2-3 sentences)
- Draft a `feature-definition.md` content and present for review

## Step 4: Register in DB

Use the feature-scaffold script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/feature-scaffold.cjs" init \
  --name <name> --branch <branch> --desc "<description>" \
  [--project <project>] [--create-branch] --json
```

This creates the feature in the DB with status `draft` and the definition content.

If the feature name already exists (active), the script bumps the version automatically.

## Step 5: Knowledge search

Call `feature_document_write` to save the definition, then `knowledge_search` with the feature name to find relevant patterns or prior work.

## Step 6: Report

> **Feature inizializzata: {name}**
> - Branch: `feature/<name>`
> - Status: `draft`
> - DB ID: {id}
>
> Prossimi passi:
> - `/feature-requirements` per definire i requisiti
> - Inizia a lavorare direttamente
