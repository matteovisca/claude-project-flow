---
name: feature-docs
description: Generate comprehensive documentation for the current feature from DB data and code changes
---

# Feature Docs

Generate a documentation file synthesizing requirements, plans, implementation decisions, and code changes.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature

1. Detect project from git root basename
2. Detect feature from branch or `$ARGUMENTS`
3. Call `feature_get` to get definition, session_log, requirements_status, plans_status

## Step 2: Gather context

1. Call `feature_document_list` to get all documents
2. Call `feature_document_read` for each relevant document (requirements, plans, context)
3. Run git commands for code context:
   - `git diff <merge-base>..HEAD --stat`
   - `git log <merge-base>..HEAD --oneline`

Or use the pre-processing script:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" diff <merge-base> --json
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/git-ops.cjs" log 20 --json
```

## Step 3: Check completeness

Warn if requirements or plans are incomplete (from `requirements_status` / `plans_status`).

## Step 4: Generate documentation

Create a structured `feature-doc` document with:
- Overview, components, API changes, key decisions
- Dependencies, patterns introduced
- Configuration, usage, files changed, known limitations

Present to user for review.

## Step 5: Save

1. Save via `feature_document_write` (type: `doc`, name: `feature-doc`)
2. Index in knowledge base via `knowledge_index`
3. Update feature status to `documented` via `feature_update`

## Step 6: Report

> **Documentazione generata per {name}**
> - Documento: `doc/feature-doc`
> - Knowledge base: indicizzato
> - Status: `documented`
>
> Prossimo passo: `/feature-merge`
