# claude-project-flow

Plugin per Claude Code che gestisce il workflow di progetto: feature lifecycle, knowledge base cross-project, sincronizzazione documentale e collaborazione team.

## Installazione

### Prerequisiti

- [Claude Code](https://claude.com/claude-code) installato
- Node.js >= 18

### Da marketplace (consigliato)

```bash
claude plugin add matteovisca/claude-project-flow
```

Claude Code scarica il plugin, installa le dipendenze runtime (`better-sqlite3`) e registra skill, hook e MCP server automaticamente.

### Da sorgente (sviluppatori)

```bash
git clone https://github.com/matteovisca/claude-project-flow.git
cd claude-project-flow
npm install
npm run build
```

Il build compila i sorgenti TypeScript, genera la distribuzione in `plugin/` e, se il plugin è già installato localmente, aggiorna automaticamente la cache in `~/.claude/plugins/cache/`.

Dopo il build, riavvia Claude Code per caricare le modifiche.

### Installazione manuale

Se il marketplace non è disponibile, copia la cartella `plugin/` nella cache:

```bash
mkdir -p ~/.claude/plugins/cache/matteovisca/claude-project-flow/0.1.0
cp -r plugin/* ~/.claude/plugins/cache/matteovisca/claude-project-flow/0.1.0/
```

Poi registra il plugin in `~/.claude/plugins/installed_plugins.json`.

## Aggiornamento

### Da marketplace

```bash
claude plugin update matteovisca/claude-project-flow
```

### Da sorgente

```bash
git pull
npm install
npm run build
```

Il build script rileva l'installazione locale e sovrascrive la cache automaticamente. Riavvia Claude Code dopo il build.

### Verificare la versione installata

```bash
cat ~/.claude/plugins/cache/matteovisca/claude-project-flow/0.1.0/.claude-plugin/plugin.json | grep version
```

## Prima configurazione

Dopo l'installazione, configura i path nella prima sessione:

```
/claude-project-flow:setup
```

Setup chiede:
- **Projects path** — dove salvare la documentazione dei progetti (es. `~/Documents/DevAiMemory/Projects`)
- **Knowledge paths** — cartelle condivise per pattern e convenzioni cross-project

Poi registra il primo progetto:

```
/claude-project-flow:project-init
```

## Skill disponibili

### Setup
| Comando | Descrizione |
|---------|-------------|
| `/setup` | Configura i path per knowledge base, progetti e override |
| `/project-init` | Analizza il codebase, crea project-definition.md, registra nel DB |

### Feature Lifecycle
| Comando | Descrizione |
|---------|-------------|
| `/feature-init` | Crea branch, directory, definition e registra nel DB |
| `/feature-requirements` | Raccoglie requisiti dettagliati con dialogo strutturato |
| `/feature-plan` | Crea e gestisce piani di implementazione |
| `/feature-list` | Dashboard feature con status e avanzamento |
| `/feature-docs` | Genera documentazione dalla feature |
| `/feature-merge` | Merge branch feature su main con archiving |
| `/feature-close` | Chiude/cancella feature senza merge |

### Sviluppo
| Comando | Descrizione |
|---------|-------------|
| `/session-save` | Sincronizza progresso sessione con i documenti |
| `/discover-patterns` | Rileva pattern e dipendenze dal git diff |
| `/requirements-sync` | Scansiona cartella requirements per aggiornamenti |

### Sincronizzazione (team)
| Comando | Descrizione |
|---------|-------------|
| `/sync` | Pull + riconcilia DB + push (flusso completo) |
| `/sync pull` | Git pull + aggiornamento DB locale |
| `/sync push` | Commit automatico + push |
| `/sync status` | Mostra stato sincronizzazione e differenze DB/file |

### Info
| Comando | Descrizione |
|---------|-------------|
| `/man` | Manuale interattivo con tutti i comandi e workflow |
| `/man <nome>` | Dettagli su un comando specifico |

Tutti i comandi vanno prefissati con `claude-project-flow:` (es. `/claude-project-flow:feature-init`).

## Script standalone

Gli script sono eseguibili da terminale senza Claude Code. Si trovano in `plugin/scripts/dist/`.

```bash
# sincronizzazione documentale
node sync.cjs [pull|push|status] [--json]

# firma documenti markdown
node sign.cjs footer <file> "<descrizione>"
node sign.cjs tag

# carica contesto feature/progetto
node context-loader.cjs <feature-name> [--json]
node context-loader.cjs --project <nome> [--json]
node context-loader.cjs [--json]              # tutti i progetti

# operazioni git pre-processate
node git-ops.cjs diff [base] [--json]
node git-ops.cjs log [count] [--json]
node git-ops.cjs merge-check [target] [--json]
node git-ops.cjs branch-info [--json]

# scaffolding feature
node feature-scaffold.cjs init --name <n> --branch <b> --desc "<d>" [--json]
node feature-scaffold.cjs archive <feature> [--json]
node feature-scaffold.cjs close <feature> --reason "<r>" --status <s> [--json]

# manuale
node man.cjs [nome-skill]
```

Tutti gli script supportano `--json` per output strutturato (utile per automazione e integrazione).

## Workflow tipico

```
1. /setup                    — configura path (una volta)
2. /project-init             — registra progetto (una volta per progetto)
3. /feature-init             — crea branch e struttura documentale
4. /feature-requirements     — definisci requisiti interattivamente
5. /feature-plan             — pianifica l'implementazione
6. ...implementa...
7. /session-save             — salva progresso sessione
8. /discover-patterns        — rileva pattern dal codice
9. /feature-docs             — genera documentazione
10. /feature-merge           — merge su main e archivia
```

### Collaborazione team

La cartella documentale (projects path) può essere una repo git condivisa:

```
/sync pull     — aggiorna dalla repo condivisa + sincronizza DB locale
...lavora...
/sync push     — committa e pusha le modifiche documentali
/sync status   — verifica stato sincronizzazione
```

Ogni documento include firma autore (git user) e tag inline per tracciare le modifiche.

## Stack

- TypeScript + esbuild → CJS bundle
- SQLite (better-sqlite3) con WAL mode
- MCP SDK per tool registration
- FTS5 per ricerca full-text cross-project

## Struttura progetto

```
claude-project-flow/
├── src/                    — sorgenti TypeScript
│   ├── db/                 — schema e database
│   ├── hooks/              — session lifecycle hooks
│   ├── server/             — MCP server e tool handlers
│   ├── sync/               — sync engine (parser, scanner, reconciler)
│   ├── utils/              — utilities (git-user, doc-signature)
│   └── scripts/            — CLI scripts standalone
├── skills/                 — SKILL.md per ogni comando
├── hooks/                  — hooks.json configuration
├── scripts/                — build pipeline
└── plugin/                 — distribuzione compilata
    ├── .claude-plugin/     — manifest e metadata
    ├── scripts/dist/       — script compilati
    ├── skills/             — skill copiate
    └── hooks/              — hooks copiati
```

## Licenza

MIT
