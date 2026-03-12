---
name: feature-close
description: Close or cancel a feature — update DB status and optionally delete branch
---

# Feature Close

Close a feature that has been abandoned, superseded, or deferred.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature

1. Detect project from git root basename
2. Detect feature from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `feature_get` to verify and get current state

## Step 2: Show state and ask reason

> **Feature: {name}** — Status: `{status}`
>
> Motivo della chiusura?
> 1. Abbandonata — non più necessaria
> 2. Sostituita — rimpiazzata da un'altra feature
> 3. Rinviata — da riprendere in futuro
> 4. Annulla

If "Sostituita", ask which feature replaces it.
Collect a brief closure reason.

## Step 3: Close in DB

Use the feature-scaffold script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/feature-scaffold.cjs" close <name> \
  --reason "<reason>" --status <cancelled|deferred> [--project <project>] --json
```

This creates a closure document in DB and updates the feature status.

For deferred features, use `force_status: draft` via `feature_update` to keep them open.

## Step 4: Cleanup branch

> Vuoi eliminare il branch `feature/<name>`?
> 1. Sì, elimina
> 2. No, mantieni

If yes: `git checkout <main> && git branch -d feature/<name>`

## Step 5: Report

> **Feature chiusa: {name}**
> - Motivo: {reason}
> - Status: `cancelled` / `draft` (rinviata)
> - Branch: eliminato / mantenuto
