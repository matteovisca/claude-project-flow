---
name: discover-patterns
description: Detect new patterns, libraries, and dependency changes from git diff and save them to DB
---

# Discover Patterns

Analyze git diff to detect new patterns, libraries, and dependency changes.
Save discoveries to the feature context in DB and index in knowledge base.

## Trigger
- **Automatic:** `SessionEnd` hook saves pending discoveries to feature's `pending_discoveries` DB column
- **Manual:** User invokes this skill for interactive review

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Pre-processing scripts

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" diff <merge-base> --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" log 20 --json
```

## Step 1: Resolve feature

1. Detect project and feature
2. Call `feature_get` — check `pending_discoveries` field for hook-saved discoveries

## Step 2: Gather diff

Use pre-processed JSON from `git-ops.cjs`.

## Step 3: Analyze

Scan for three categories:

### 3a: New dependencies
Parse dependency file diffs (package.json, *.csproj, etc.) for added/removed/updated packages.

### 3b: New patterns
Detect architectural/design patterns not previously used: new abstractions, structural patterns, error handling, testing patterns.

### 3c: Convention changes
Detect shifts in naming, file organization, imports, configuration.

## Step 4: Present discoveries (interactive)

Show findings table. For each discovery, ask:
> 1. Confermare e salvare nella knowledge base
> 2. Ignorare
> 3. Arricchire con note

Ask if each should be a **project convention** or feature-specific.

## Step 5: Save

1. Save discoveries document via `feature_document_write` (type: `context`, name: `discoveries`)
2. Clear `pending_discoveries` field via `feature_update`
3. For each confirmed discovery, call `knowledge_index`

## Step 6: Report

> **Scoperte registrate per {name}:**
> - Dipendenze: N
> - Pattern: M
> - Convenzioni: K
