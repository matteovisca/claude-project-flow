---
name: man
description: Interactive manual — lists all skills, scripts, and commands with descriptions and usage examples
---

# Man — Manuale interattivo

Mostra tutte le skill e gli script disponibili in claude-project-flow, con descrizioni, parametri e esempi d'uso.

## Parameters
- `$ARGUMENTS` — Nome di una skill o script specifica per i dettagli (opzionale)

## Step 1: Load manual data

Run the man script to get all available skills and scripts:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/man.cjs" $ARGUMENTS --json
```

If `CLAUDE_PLUGIN_ROOT` is not set, use fallback: `$HOME/.claude/plugins/marketplaces/matteovisca/plugin/scripts/dist/man.cjs`

## Step 2: Present overview (no arguments)

If no specific skill/script was requested, present the full manual grouped by category:

> **claude-project-flow — Manuale**
>
> ### 🔧 Setup
> | Comando | Descrizione |
> |---------|-------------|
> | `/setup` | Configura i path per knowledge base, progetti e override |
> | `/project-init` | Analizza il codebase, crea project-definition.md, registra nel DB |
>
> ### 🔄 Feature Lifecycle
> | Comando | Descrizione |
> |---------|-------------|
> | `/feature-init` | Crea branch, directory, definition e registra nel DB |
> | `/feature-requirements` | Raccoglie requisiti dettagliati con dialogo strutturato |
> | `/feature-plan` | Crea e gestisce piani di implementazione |
> | `/feature-list` | Dashboard feature con status e avanzamento |
> | `/feature-docs` | Genera documentazione dalla feature |
> | `/feature-merge` | Merge branch feature su main con archiving |
> | `/feature-close` | Chiude/cancella feature senza merge |
>
> ### 💻 Sviluppo
> | Comando | Descrizione |
> |---------|-------------|
> | `/session-save` | Sincronizza progresso sessione con i documenti |
> | `/discover-patterns` | Rileva pattern e dipendenze dal git diff |
> | `/requirements-sync` | Scansiona cartella requirements per aggiornamenti |
>
> ### 🔁 Sincronizzazione
> | Comando | Descrizione |
> |---------|-------------|
> | `/sync [pull\|push\|status]` | Sincronizza cartella documentale via git + DB |
>
> ### 📦 Script standalone
> Eseguibili direttamente da terminale con `node <script> [args]`:
>
> | Script | Descrizione | Uso |
> |--------|-------------|-----|
> | `sync.cjs` | Git pull/push + reconcilia DB | `node sync.cjs [pull\|push\|status]` |
> | `sign.cjs` | Firma documenti con footer/tag | `node sign.cjs footer <file> <desc>` |
> | `context-loader.cjs` | Carica contesto feature in JSON | `node context-loader.cjs <feature>` |
> | `git-ops.cjs` | Pre-processa operazioni git | `node git-ops.cjs diff\|log\|merge-check` |
> | `feature-scaffold.cjs` | Scaffolding e archiving | `node feature-scaffold.cjs init\|archive\|close` |
>
> **Chiedi dettagli su un comando specifico:** `/man <nome>`

## Step 3: Present detail (with arguments)

If a specific skill or script was requested, show full details:

### For skills:
- Full description
- All parameters with explanation
- Step-by-step workflow summary (condensed from the SKILL.md)
- Scripts used behind the scenes
- Example usage

### For scripts:
- Description
- All sub-commands with arguments
- Example invocations for each sub-command
- Output format (human-readable vs --json)

## Step 4: Interactive exploration

After showing the manual or details, offer:

> Vuoi:
> 1. Dettagli su un altro comando
> 2. Un esempio pratico di workflow (dalla creazione feature al merge)
> 3. Tornare al lavoro

### Option 2: Workflow example
If the user asks for a workflow example, present:

> **Workflow tipico — dalla feature al merge:**
>
> 1. `/setup` — Configura i path (una volta sola)
> 2. `/project-init` — Registra il progetto (una volta per progetto)
> 3. `/feature-init` — Crea branch e struttura documentale
> 4. `/feature-requirements` — Definisci i requisiti interattivamente
> 5. `/feature-plan` — Pianifica l'implementazione
> 6. *...implementa la feature...*
> 7. `/session-save` — Salva il progresso della sessione
> 8. `/discover-patterns` — Rileva pattern dal codice
> 9. `/feature-docs` — Genera documentazione
> 10. `/feature-merge` — Merge su main e archivia
>
> **Per team multi-sviluppatore:**
> - `/sync pull` — Aggiorna cartella condivisa e DB locale
> - `/sync push` — Committa e pusha le modifiche documentali
> - `/sync status` — Verifica stato sincronizzazione
