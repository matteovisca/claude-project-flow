---
name: feature-list
description: Show all features across projects with status, progress, and quick actions
---

# Feature List

Show a comprehensive overview of all features across registered projects.

## Parameters
- `$ARGUMENTS` — Optional filter: project name, status, or "all" (include closed)

## Step 1: Load data

1. Call `project_list` to get all projects
2. Call `feature_list` — apply filter if `$ARGUMENTS` matches a project or status
3. For each feature, the response includes status, branch, created_at, closed_at

## Step 2: Enrich with context

For each active feature, call `feature_get` to read `requirements_status` and `plans_status` JSON fields.
Use `feature_document_list` to count documents per feature.

## Step 3: Display

Present features grouped by project:

> **Progetto: {project}**
>
> | Feature | Status | Requisiti | Piano | Docs |
> |---------|--------|-----------|-------|------|
> | `feat-a` | `in-progress` | 95% | 3/8 | 4 |
> | `feat-b` | `draft` | — | — | 0 |

If no features: suggest `/feature-init`.

## Step 4: Quick actions

> 1. Vedere i dettagli di una feature
> 2. Tornare al lavoro

For details: show full DB state, documents list, requirements summary, plan progress.
