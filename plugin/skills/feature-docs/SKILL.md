---
name: feature-docs
description: Generate comprehensive documentation for the current feature from requirements, plans, code changes, and session logs
---

# Feature Docs

Generate a documentation file for the feature, synthesizing requirements, plans, implementation decisions, and code changes into a structured document ready to be merged into the project's documentation.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Pre-processing scripts

Before generating documentation, load all feature context in one call:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/context-loader.cjs" <feature_name> --json
```

This returns definition, requirements, plans, session logs, and discoveries pre-parsed. Use this JSON for all documentation generation instead of reading files individually.

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__settings_get` to resolve docs path
4. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
5. Verify feature exists in DB via `project_flow__feature_get`

## Step 2: Gather all feature context

Read all available feature documentation:

1. `FEATURE_DIR/requirements/requirements.md` — what was required
2. `FEATURE_DIR/plans/*.md` — how it was planned (active + completed plans)
3. `FEATURE_DIR/context/session-log.md` — what happened during development
4. `FEATURE_DIR/context/discoveries.md` — patterns and libraries discovered
5. `FEATURE_DIR/context/.plans-status.json` — plan completion state
6. `FEATURE_DIR/context/.requirements-status.json` — requirements coverage
7. `FEATURE_DIR/feature-definition.md` — original feature description

Also gather code context:
8. `git diff <merge-base>..HEAD --stat` — all files changed
9. `git log <merge-base>..HEAD --oneline` — commit history

## Step 3: Check completeness

Before generating docs, verify:
- Are all requirements addressed? (check `.requirements-status.json`)
- Are all plan steps completed? (check `.plans-status.json`)

If incomplete, warn:
> **Attenzione:** La feature non risulta completata:
> - Requisiti: X% copertura
> - Piano "Y": 3/5 step completati
>
> Vuoi generare la documentazione comunque? (verrà annotata come parziale)

## Step 4: Generate documentation

Create `FEATURE_DIR/docs/feature-doc.md`:

```markdown
# <Feature Name>

> Project: <project_name> | Branch: `feature/<name>` | Status: implemented
> Created: <date> | Completed: <date>

## Overview
<!-- 3-5 sentences synthesized from feature-definition.md and requirements -->
<!-- What the feature does, why it was needed, key design decisions -->

## What was implemented

### Components
<!-- List of main components/modules created or modified -->
- **<component>** (`path/to/file`) — <what it does>

### API / Interface changes
<!-- New or modified public interfaces, endpoints, commands, tools -->
- `<interface>` — <description>

### Key decisions
<!-- Architectural decisions made during implementation, from session logs and discoveries -->
- <decision and rationale>

## Dependencies
<!-- New dependencies introduced, from discoveries.md -->
- **<package>** (version) — <why it was added>

## Patterns introduced
<!-- New patterns, from discoveries.md. Only those marked as project convention -->
- **<pattern name>** — <description and where it's used>

## Configuration
<!-- Any new configuration, settings, environment variables -->

## Usage
<!-- How to use the feature: commands, examples, workflows -->

## Files changed
<!-- Summary from git diff stat -->
| File | Change |
|------|--------|
| `src/...` | <what changed> |

## Known limitations
<!-- From requirements "Out of Scope" + any open items from session logs -->
- <limitation>
```

Present to the user for review and incorporate feedback.

## Step 5: Check for existing project docs

Look for project-level documentation:
1. Check `FEATURE_DIR/../../docs/` (project docs directory in the feature docs path)
2. Check common locations in the repo: `docs/`, `doc/`, `README.md`

If project docs directory exists, show:
> La documentazione del progetto è in `<path>`.
> Vuoi che prepari anche la sezione da aggiungere alla docs del progetto? (verrà integrata durante il merge)

If yes, generate a condensed version suitable for insertion:
- Save as `FEATURE_DIR/docs/project-doc-section.md`
- This is a shorter version focused on usage and API, without implementation details

## Step 6: Index in knowledge base

Call `project_flow__knowledge_index` with:
- `path`: `FEATURE_DIR/docs/feature-doc.md`
- `project`: project name

## Step 7: Update feature in DB

Call `project_flow__feature_update` with:
- `project`: project name
- `name`: feature name
- `status`: `documented`

## Step 8: Report

> **Documentazione generata per {feature_name}:**
> - `docs/feature-doc.md` — documentazione completa
> - `docs/project-doc-section.md` — sezione per la docs del progetto (se richiesta)
> - Knowledge base: indicizzato
>
> Prossimo passo: `/claude-project-flow:feature-merge` per integrare nel branch principale.
