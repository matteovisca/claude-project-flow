---
name: feature-plan
description: Create, manage and track user-defined implementation plans for the active feature
---

# Feature Plan

Create and manage strategic implementation plans defined by the user.
Each plan has a name, covers the entire feature or a specific part, and tracks progress via status in context.

## Parameters
- `$ARGUMENTS` — Plan name or feature name (optional)

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__settings_get` to resolve docs path
4. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
5. Verify feature exists in DB via `project_flow__feature_get`
6. Ensure `FEATURE_DIR/plans/` directory exists

## Step 2: Check existing plans

Read `FEATURE_DIR/context/.plans-status.json` if it exists:

```json
{
  "plans": [
    {
      "name": "plan-name",
      "file": "plan-name.md",
      "status": "active" | "completed" | "superseded",
      "progress": { "total": 10, "done": 3 },
      "created": "ISO date",
      "updated": "ISO date"
    }
  ]
}
```

### If plans exist:
Show current plans:
> **Piani per "{feature_name}":**
>
> | Piano | Stato | Avanzamento |
> |-------|-------|-------------|
> | `plan-name` | active | 3/10 step |
> | `other-plan` | completed | 5/5 step |
>
> Vuoi:
> 1. Creare un nuovo piano
> 2. Aggiornare un piano esistente
> 3. Visualizzare i dettagli di un piano

### If no plans:
> Nessun piano trovato per questa feature. Creiamone uno.

Proceed to Step 3.

## Step 3: Create new plan

### 3a: Collect plan info
Ask the user:
> **Come vuoi chiamare questo piano?**
> (es. "setup-database", "api-endpoints", "ui-components", o "main" per il piano principale)

Then:
> **Cosa deve coprire questo piano?**
> Descrivi l'obiettivo e le fasi principali. Posso anche leggere i requisiti per proporti una struttura.

### 3b: Load context
Read existing feature docs to inform the plan:
- `FEATURE_DIR/requirements/requirements.md` — requirements to address
- `FEATURE_DIR/context/session-log.md` — what's already been done
- Other plans in `FEATURE_DIR/plans/` — avoid overlap

### 3c: Search similar plans (cross-project)
Call `project_flow__knowledge_search` with:
- `query`: plan name + feature keywords
- `category`: `plan`

If results found:
> **Piani simili in altri progetti:**
> - <project>/<feature>: <plan title>
>
> Vuoi approfondire o proseguire?

### 3d: Draft the plan
Based on user input, requirements, and context, draft the plan:

```markdown
# Plan: <plan-name>

> Feature: <feature_name> | Created: <ISO date> | Status: active

## Objective
<!-- What this plan aims to accomplish -->

## Scope
<!-- What part of the feature this covers. "Full feature" or specific area -->

## Requirements addressed
<!-- List which FR/NFR/EC this plan covers -->
- FR-1: <title>
- FR-3: <title>

## Phases

### Phase 1: <title>
- [ ] <step description>
- [ ] <step description>

### Phase 2: <title>
- [ ] <step description>

## Technical notes
<!-- Implementation details, dependencies, risks, decisions -->

## Files involved
<!-- Expected files to create or modify -->
- `src/...` — <what>
```

Present to user for review and incorporate feedback before saving.

## Step 4: Save plan

1. Save as `FEATURE_DIR/plans/<plan-name>.md`
2. Update `FEATURE_DIR/context/.plans-status.json`:
   - Add new plan entry with status `active`, count total steps from `- [ ]` checkboxes
3. If this is the first plan, mark any other `active` plans that cover the same scope as `superseded`

## Step 5: Update existing plan

When the user selects an existing plan to update:

### View progress
Parse the plan file, count `- [x]` vs `- [ ]` and `- [~]`, show:
> **Piano: <plan-name>** — <done>/<total> step completati
>
> ### Phase 1: <title>
> - [x] Step 1 — completato
> - [~] Step 2 — parziale
> - [ ] Step 3 — da fare
>
> Vuoi:
> 1. Aggiornare lo stato degli step
> 2. Modificare il piano (aggiungere/rimuovere step)
> 3. Marcare come completato

### Update step status
Ask which steps to update. Apply changes to the plan file:
- `- [ ]` → `- [x]` with ` (done: <date>)`
- `- [ ]` → `- [~]` with ` (partial: <note>)`

### Modify plan
Allow adding/removing phases and steps. Track in the plan file.

### Mark complete
When all steps are done (or user declares it complete):
- Update plan status to `completed` in `.plans-status.json`
- Update `> Status: active` → `> Status: completed` in the plan file

## Step 6: Index in knowledge base

Call `project_flow__knowledge_index` with:
- `path`: the plan file path
- `project`: project name

This runs on both creation and updates.

## Step 7: Update feature status in DB

Determine status based on plans:
- If any plan is `active` → feature status `in-progress`
- If all plans are `completed` → feature status `implementation-done`
- If no plans have started → keep current status

Call `project_flow__feature_update` with the appropriate status.

## Step 8: Report

> **Piano "{plan-name}" {created/updated}**
> - Feature: {feature_name}
> - Path: `plans/{plan-name}.md`
> - Avanzamento: {done}/{total} step
> - Knowledge base: indicizzato
> - Status feature: `{status}`


## Document Signing

After writing or modifying any markdown file in the feature directory, sign it using the sign script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/sign.cjs" footer "<file_path>" "<brief description of change>"
```

If `CLAUDE_PLUGIN_ROOT` is not set, use the fallback: `$HOME/.claude/plugins/marketplaces/matteovisca/plugin/scripts/dist/sign.cjs`

For inline modification tags, get the tag and insert it at the modification point:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/sign.cjs" tag
```
Output example: `<!-- @matteovisca 2026-03-09 -->`

Insert the tag on the line immediately after the modified section heading or paragraph.
