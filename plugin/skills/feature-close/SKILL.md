---
name: feature-close
description: Close or cancel a feature without merging — archive docs and update DB
---

# Feature Close

Close a feature that has been abandoned, superseded, or is no longer needed, without performing a merge.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__feature_get` to verify feature exists and get current state
4. Call `project_flow__settings_get` to resolve docs path
5. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`

## Step 2: Show feature state

Present the current state:
> **Feature: {feature_name}**
> - Status: `{status}`
> - Branch: `{branch}`
> - Requisiti: {coverage}% copertura
> - Piani: {active_count} attivi, {completed_count} completati
>
> **Motivo della chiusura?**
> 1. Abbandonata — non più necessaria
> 2. Sostituita — rimpiazzata da un'altra feature
> 3. Rinviata — da riprendere in futuro
> 4. Annulla — non voglio chiudere

### Option 4: Cancel
- Stop, do nothing

## Step 3: Collect closure details

Ask the user:
> Descrivi brevemente il motivo della chiusura (opzionale, ma utile per riferimento futuro):

Save the reason for the closure note.

If "Sostituita", ask:
> Quale feature la sostituisce?

## Step 4: Archive feature docs

If `FEATURE_DIR` exists:

1. Determine version number (next `vN` in `Archive/`)
2. Move all root-level content (except `Archive/`) into `Archive/vN/`
3. Create a `Archive/vN/CLOSURE.md`:

```markdown
# Closure: <feature_name>

> Date: <ISO date>
> Reason: abandoned | superseded | deferred
> Previous status: <status>

## Notes
<user's closure reason>

## Superseded by
<other feature name, if applicable>
```

## Step 5: Update DB

Call `project_flow__feature_update` with:
- `project`: project name
- `name`: feature name
- `force_status`: `cancelled` (for abandoned/superseded) or `draft` (for deferred — so it can be resumed)

For deferred features, do NOT set `closed_at` — keep them open in the DB so they appear in `feature-list`.

## Step 6: Cleanup branch

Ask the user:
> Vuoi eliminare il branch `feature/<name>`?
> 1. Sì, elimina
> 2. No, mantieni (utile se rinviata)

If yes and not currently on that branch:
```
git branch -d feature/<name>
```

If currently on that branch:
```
git checkout <main_branch>
git branch -d feature/<name>
```

## Step 7: Report

> **Feature chiusa: {feature_name}**
>
> | | |
> |---|---|
> | **Motivo** | {reason} |
> | **Docs** | archiviate in `Archive/vN/` |
> | **Status** | `cancelled` / `draft` (rinviata) |
> | **Branch** | eliminato / mantenuto |
