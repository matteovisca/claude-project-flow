---
name: feature-list
description: Show all features across projects with status, progress, and quick actions
---

# Feature List

Show a comprehensive overview of all features across all registered projects.

## Parameters
- `$ARGUMENTS` — Optional filter: project name, status, or "all"

## Step 1: Load data

1. Call `project_flow__project_list` to get all registered projects
2. Call `project_flow__feature_list` to get all features
   - If `$ARGUMENTS` matches a project name, filter by that project
   - If `$ARGUMENTS` matches a status (draft, in-progress, etc.), filter by status
   - If `$ARGUMENTS` is "all", include closed features too
3. Call `project_flow__settings_get` to resolve docs paths for context files

## Step 2: Enrich with context

Use the context-loader script to gather all enrichment data in one call:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/context-loader.cjs" --project <project_name> --json
```

This returns all features with their requirements status, plan progress, and session info pre-parsed.
No need to read individual files — the JSON output contains everything needed for the table.

## Step 3: Display

Present features grouped by project:

> **Progetto: {project_name}**
>
> | Feature | Status | Requisiti | Piano | Ultima sessione |
> |---------|--------|-----------|-------|-----------------|
> | `feature-a` | `in-progress` | 95% | main 3/8 | 2026-03-07 |
> | `feature-b` | `draft` | — | — | — |
> | `feature-c` | `implemented` | 100% | done | 2026-03-05 |
>
> **Progetto: {other_project}**
>
> | Feature | Status | Requisiti | Piano | Ultima sessione |
> |---------|--------|-----------|-------|-----------------|
> | `feature-x` | `requirements-done` | 98% | — | 2026-03-06 |

If no features found:
> Nessuna feature registrata. Usa `/claude-project-flow:feature-init` per iniziare.

## Step 4: Quick actions

After showing the list, offer:
> Vuoi:
> 1. Vedere i dettagli di una feature
> 2. Tornare al lavoro

### Option 1: Feature details
Ask which feature, then show:
- Full status from DB
- Requirements summary (count FR/NFR/EC, coverage)
- Active plans with step-by-step progress
- Last session summary (open items)
- Pending discoveries/warnings
- File tree of the feature directory
