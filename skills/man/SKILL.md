---
name: man
description: Interactive manual — lists all skills, scripts, and commands with descriptions and usage examples
---

# Man — Manuale interattivo

Mostra tutte le skill e gli script disponibili in claude-project-flow.

## Parameters
- `$ARGUMENTS` — Nome di una skill o script specifica per i dettagli (opzionale)

## Step 1: Load manual data

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/man.cjs" $ARGUMENTS --json
```

## Step 2: Overview (no arguments)

> **claude-project-flow — Manuale**
>
> ### Setup
> | Comando | Descrizione |
> |---------|-------------|
> | `/project-init` | Analizza codebase, registra progetto nel DB |
> | `/setup-permissions` | Configura permessi plugin in un passo |
>
> ### Feature Lifecycle
> | Comando | Descrizione |
> |---------|-------------|
> | `/feature-init` | Crea branch e registra feature nel DB |
> | `/feature-requirements` | Raccoglie requisiti con dialogo strutturato |
> | `/feature-plan` | Crea e gestisce piani di implementazione |
> | `/feature-list` | Dashboard feature con status e avanzamento |
> | `/feature-docs` | Genera documentazione dalla feature |
> | `/feature-merge` | Merge su main e aggiorna status |
> | `/feature-close` | Chiude/cancella feature |
>
> ### Sviluppo
> | Comando | Descrizione |
> |---------|-------------|
> | `/session-save` | Sincronizza progresso sessione nel DB |
> | `/discover-patterns` | Rileva pattern e dipendenze dal git diff |
>
> ### Script standalone
> | Script | Descrizione |
> |--------|-------------|
> | `context-loader.cjs` | Carica contesto feature/progetto dal DB in JSON |
> | `git-ops.cjs` | Pre-processa operazioni git (diff, log, merge-check) |
> | `feature-scaffold.cjs` | Init e close feature nel DB |
> | `project-git.cjs` | Git log/diff/status su progetto registrato |
> | `man.cjs` | Questo manuale |
> | `setup-permissions.cjs` | Configura permessi plugin |

## Step 3: Detail (with arguments)

Show full skill description, parameters, workflow, and examples.

## Step 4: Workflow example

> **Workflow tipico:**
> 1. `/project-init` — Registra il progetto
> 2. `/feature-init` — Crea branch e feature nel DB
> 3. `/feature-requirements` — Definisci requisiti
> 4. `/feature-plan` — Pianifica implementazione
> 5. *...implementa...*
> 6. `/session-save` — Salva progresso
> 7. `/discover-patterns` — Rileva pattern
> 8. `/feature-docs` — Genera documentazione
> 9. `/feature-merge` — Merge e archivia
