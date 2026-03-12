---
name: feature-plan
description: Create, manage and track implementation plans for the active feature
---

# Feature Plan

Create and manage strategic implementation plans. Plans are stored as documents in the DB.

## Parameters
- `$ARGUMENTS` — Plan name or feature name (optional)

## Step 1: Resolve feature

1. Detect project from git root basename
2. Detect feature from branch or `$ARGUMENTS`
3. Call `feature_get` to verify and get `plans_status` JSON
4. Call `feature_document_list` with `type: plan` to see existing plans

## Step 2: Check existing plans

If plans exist, show table (name, status, progress) from `plans_status` and ask:
> 1. Creare un nuovo piano
> 2. Aggiornare un piano esistente
> 3. Visualizzare i dettagli di un piano

If no plans: proceed to create.

## Step 3: Create new plan

### 3a: Collect info
- Ask for plan name and objective
- Read requirements document via `feature_document_read` (type: requirements, name: requirements)

### 3b: Cross-project search
Call `knowledge_search` with plan keywords, category `plan`.

### 3c: Draft the plan
Create a structured plan with Phases, checkboxes, technical notes, files involved.

Present to user for review.

## Step 4: Save plan

1. Save via `feature_document_write` (type: `plan`, name: plan-name)
2. Update `plans_status` JSON in feature via `feature_update`:
   ```json
   { "plans": [{ "name": "...", "status": "active", "progress": { "total": N, "done": 0 } }] }
   ```

## Step 5: Update existing plan

- Parse plan content, count `[x]` vs `[ ]`
- Show progress, ask what to update
- Apply checkbox changes to plan content
- Save updated plan via `feature_document_write`
- Update `plans_status` JSON via `feature_update`

## Step 6: Finalize

1. Index plan in knowledge base via `knowledge_index`
2. Update feature status based on plan state:
   - Any active plan → `in-progress`
   - All completed → `implementation-done`
3. Call `feature_update` with new status

## Step 7: Report

> **Piano "{name}" {created/updated}**
> - Avanzamento: {done}/{total} step
> - Status feature: `{status}`
