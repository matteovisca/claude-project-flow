---
name: feature-requirements
description: Collect and validate detailed requirements for the active feature through structured dialogue
---

# Feature Requirements

Collect structured requirements through iterative dialogue until understanding reaches >95%.
All data is stored in the DB via MCP tools.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature

1. Detect project from git root basename
2. Detect feature from branch or `$ARGUMENTS`
3. Call `feature_get` to verify registration
4. Call `feature_document_list` to check for existing requirements document

## Step 2: Check existing state

Read the feature's `requirements_status` field (JSON) from `feature_get`.

- **If incomplete**: show coverage %, resume with pending questions
- **If complete**: offer to review, add, or modify requirements
- **If not started**: proceed to Step 3

## Step 3: Cross-project search

Call `knowledge_search` with feature name + description keywords, category `requirement`.

If results found, present grouped by project and ask:
> 1. Approfondire una soluzione esistente
> 2. Ignorare e partire da zero
> 3. Proseguire — tengo presente come riferimento

## Step 4: Initial deduction

Read the feature definition from `feature_get` response.
Generate initial deduction of what the feature needs.

## Step 5: Detailed description collection

Ask the user for a detailed description. Evaluate coverage across:
- Functional completeness (0-30%)
- Edge cases (0-20%)
- Technical constraints (0-20%)
- Acceptance criteria (0-15%)
- Scope boundaries (0-15%)

If < 95%, ask structured questions (max 3 rounds).

Save progress after each round via `feature_update` with `requirements_status` JSON.

## Step 6: Generate requirements document

Create the requirements document via `feature_document_write`:
- `doc_type`: `requirements`
- `doc_name`: `requirements`
- Content follows the standard template (FR, NFR, EC, Out of Scope, Changelog)

Present to user for review.

## Step 7: Post-completion changes

For additions: assign next sequential ID, add to document, append to changelog.
For modifications: update text, append to changelog.
For removals: strikethrough with reason, append to changelog.

After any change, update the document via `feature_document_write`.

## Step 8: Finalize

1. Update `requirements_status` JSON in feature via `feature_update`
2. Call `knowledge_index` with the requirements content
3. If complete, update feature status to `requirements-done` via `feature_update`

## Step 9: Report

> **Requisiti {name}:** {status}
> - Copertura: X%
> - FR: N | NFR: N | EC: N
>
> Prossimo passo: `/feature-plan` per pianificare l'implementazione.
