# Project Flow — Orchestrator Redesign (v1)

Data: 2026-04-21
Stato: design approvato, in attesa di review finale utente.

## 1. Contesto e obiettivo

Il plugin `claude-project-flow` è arrivato alla terza riscrittura (scaffold → rebuild structure → V1_Db_Only) a causa di scope creep progressivo: knowledge base cross-project, DB SQLite, dashboard React, MCP server, sync git basata su file, firma documenti. L'utente ha riconosciuto che il pasticcio nasce dall'aver pensato il plugin come **assistente globale** anziché come **compagno per-progetto**.

Questa riscrittura ripensa il plugin come **orchestratore di workflow per-progetto**:
- scope limitato a un singolo progetto per volta
- struttura file-based pura (solo markdown, nessun DB)
- nessun MCP server (risparmia token e complessità)
- delega il "come lavorare" a plugin esterni già installati (principalmente `superpowers`, ma anche `codex`, `frontend-design`, ecc.)
- organizza tutti gli output nella struttura cartelle del progetto

Il plugin diventa il **direttore di cantiere**: sa dove sei (progetto, feature), sa chi chiamare (mapping scopi → plugin), sa dove mettere le cose (struttura `.project-flow/`).

## 2. Scope

### In scope (v1 / MVP)

- 5 skill: `start-feature`, `requirements`, `plan`, `close-feature`, `man`
- Mini-CLI `pf` con 4 comandi deterministici
- Struttura cartelle `.project-flow/` con pattern flat numerato per requirements e plans
- `config.md` per-progetto con sezioni: Identity, Branch convention, Folder layout, Plugin mapping, Workflow rules, Glossary
- `context.md` vivi: uno cross-feature, uno per feature
- Pattern annuncio ibrido C (reversibile → procede, irreversibile → conferma)
- Integrazione con `superpowers:writing-plans` (via skill `plan`)
- Hook SessionStart leggero (validazione config + plugin mappati)

### In scope (v1.1 — dopo uso sul campo)

- Skill `suspend` / `resume`: disattiva routing per flussi esplorativi
- Skill `harvest`: ordina flusso libero in struttura archiviabile
- Routing esplicito per `tdd`, `review`, `design-ui` (come skill dedicate del plugin)
- Skill `scope-audit`: confronta git diff vs requirements, segnala out-of-scope
- Pattern annuncio D: override per-skill nel config.md (predisposto nel parser v1, abilitato in v1.1)
- Sintesi `current.md` opzionale accanto ai file numerati in requirements/ e plans/

### In scope (v2 — backlog avanzato)

- Cross-review Codex (D ibrido: suggerito di default, gate opzionale via config)
- Debate loop Claude↔Codex con report finale in `features/<slug>/debates/`
- Piano retrospettivo fittizio per cose fatte fuori scope (dopo scope-audit)
- Pattern cascata librerie condivise (famiglia "library")

### Fuori scope (definitivamente)

- DB SQLite o altro persistence store
- MCP server
- Dashboard web (React, Hono, Monaco, xterm, node-pty)
- Sync file-based tra team (git del progetto basta)
- Firma documenti inline
- Knowledge base cross-project (eventualmente sarà un plugin orchestratore separato)
- Skill `brainstorm`, `debug` come routing dedicato (si invoca il plugin esterno a mano)
- Skill `design-graphic` (caso raro, eventualmente via config override)

## 3. Architettura

Tre layer con responsabilità nette:

```
┌─ Layer 1 — Skill markdown (skills/) ────────────────────┐
│  Dialogo, orchestrazione, annunci, routing verso plugin │
│  esterni. Zero determinismo. Claude legge ed esegue.    │
└─────────────────────────────────────────────────────────┘
                         ↓ invoca via Bash
┌─ Layer 2 — CLI `pf` (dist/pf.cjs, <200 LOC) ────────────┐
│  Operazioni meccaniche: scaffold, numbering, detection  │
│  contesto, validate-config. Output JSON parseabile.     │
│  NIENTE routing, NIENTE dialogo, NIENTE LLM.            │
└─────────────────────────────────────────────────────────┘
                         ↓ legge/scrive
┌─ Layer 3 — Filesystem `.project-flow/` + git ───────────┐
│  Fonte unica di verità: config.md, context.md, features/│
│  Versionato con la repo del progetto.                   │
└─────────────────────────────────────────────────────────┘
```

### Invarianti

- Tutto ciò che l'utente vede (dialogo, output, annunci) passa per Layer 1
- Tutto ciò che è identico a ogni esecuzione (numbering, paths, detection) passa per Layer 2
- Tutto ciò che è persistente sta in Layer 3 (solo `.md`)

### Session-start hook

Leggerissimo. Invoca `pf validate-config` e stampa una riga di stato in terminale. Non blocca, non modifica nulla, zero token Claude.

### Dipendenze

- Runtime: solo Node.js ≥18 (già requisito di Claude Code)
- NPM: zero dipendenze runtime del CLI (solo built-in `fs`, `path`, `child_process`)
- Dev: esbuild per bundling TS→CJS, TypeScript
- Plugin esterni richiamati: `superpowers`, `codex` (v2), opzionalmente `frontend-design`

## 4. Struttura filesystem

### Dentro il progetto cliente

```
<progetto>/
└── .project-flow/
    ├── config.md                 # adattamento progetto (override default)
    ├── context.md                # stato vivo cross-feature
    │
    ├── decisions/                # ADR cross-feature (flat, numerato)
    │   └── 001-use-postgres.md
    │
    ├── shared/                   # note, spike trasversali
    │
    └── features/
        └── <slug>/
            ├── context.md        # stato vivo della feature
            ├── requirements/     # flat, numerato
            │   ├── 001-initial.md
            │   └── 002-addendum-security.md
            ├── plans/            # flat, numerato
            │   ├── 001-auth-api.md
            │   └── 002-auth-ui.md
            ├── research/         # flat, no numbering (opzionale)
            ├── design/           # flat, no numbering (opzionale)
            └── docs/             # generato a close-feature
                ├── overview.md
                ├── implementation.md
                └── edge-cases.md
```

### Regole

- Pattern **flat numerato** (`NNN-<slug>.md`) per ordine cronologico dove serve: requirements, plans, decisions. Padding 3 cifre.
- Cartelle `research/`, `design/`, `docs/` sono **on-demand**: create solo quando servono.
- Cartelle cross-feature `decisions/` e `shared/` sono **predisposte ma non create automaticamente** in v1. Si creano quando l'utente (o una skill futura) le popola per la prima volta.
- Override path via `config.md` → sezione Folder layout (es. `decisions_dir: docs/adr` se gli ADR vivono già altrove).

### Repo del plugin (sorgente)

```
<plugin-root>/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── skills/
│   ├── start-feature/SKILL.md
│   ├── requirements/SKILL.md
│   ├── plan/SKILL.md
│   ├── close-feature/SKILL.md
│   └── man/SKILL.md
├── src/
│   └── cli.ts                    # sorgente CLI
├── plugin/
│   ├── dist/pf.cjs               # bundle shipped
│   ├── bin/pf                    # wrapper shell
│   └── hooks/hooks.json          # session-start hook
├── scripts/build.js              # esbuild bundle
└── package.json
```

## 5. Schema `config.md`

```markdown
# Project Flow Config

## Identity
- name: acme-webapp
- family: vids                    # roadmapp | grc | vids | library | standalone
- stack: Next.js, TypeScript, Postgres
- description: gestionale ordini B2B

## Branch convention
- feature: `feature/<slug>`
- us: `US-<n>-<slug>`              # attivo se family=grc
- fix: `fix/<slug>`                # no scaffold feature dir

## Folder layout
# features_dir: .project-flow/features
# decisions_dir: docs/adr
# design_dir: design/mockups

## Plugin mapping
- plan: superpowers:writing-plans
- brainstorm: superpowers:brainstorming
- tdd: superpowers:test-driven-development
- review: superpowers:requesting-code-review
- close: superpowers:finishing-a-development-branch
- cross-review: codex:rescue

## Workflow rules
- cross_review: suggested          # suggested | required | off
- scope_audit: off                 # v1.1
- announce_default: hybrid         # hybrid | always-confirm | always-proceed

## Glossary
# - "user story" → requirements
# - "spike" → research
```

### Principi

- **Tutto ha un default**: il config contiene solo override
- **Template con default commentati**: editing a mano senza documentazione esterna
- **Validazione via CLI** a session-start: plugin mappato non installato → warning non bloccante
- **`family` è hint, non vincolo**: determina template suggeriti ma non comportamenti rigidi

### Cosa NON va nel config

- Stato/progresso (vive in `context.md`)
- Segreti o path assoluti utente-specifici (config è versionato su git)

## 6. Mini-CLI `pf`

Un unico bundle CJS, invocato dalle skill via Bash. Output umano + flag `--json` per parsing.

### Comandi MVP

```
pf context [--json]
  Ritorna: project, family, feature (o null), feature_dir, plugins, announce

pf start-feature <slug> [--branch <b>] [--from <base>]
  1. Crea o checkout branch (se esiste già: checkout silenzioso)
  2. Se .project-flow/features/<slug>/ esiste già: exit con warning, non sovrascrive
  3. Altrimenti scaffolda: context.md, requirements/ (dir vuota), plans/ (dir vuota)
  4. NON crea: research/, design/, docs/ (on-demand)

pf next-number <slug>/<type>
  Ritorna il prossimo NNN (padding 3) per requirements/plans/decisions

pf validate-config [--json]
  Exit 0 = ok, 1 = warnings, 2 = errors. Usato da session-start hook.
```

### Principi (contratto non negoziabile)

1. **Deterministico**: stesso input → stesso output
2. **JSON-first**: skill parsano JSON, non testo
3. **Fail-safe**: errori strutturati con `error` + `hint`, mai stack trace
4. **Tetto hard**: <200 LOC Node in v1
5. **Niente state**: legge filesystem + git, scrive file markdown nel progetto cliente
6. **Cosa il CLI NON farà mai**: routing plugin, dialogo, orchestrazione inter-agente, persistenza propria

## 7. Skill MVP

Per ciascuna: dialogo, CLI invocato, plugin esterni invocati, output scritti, pattern annuncio.

### 7.1 `/project-flow:start-feature <slug>`

- Dialogo breve: conferma slug, opzionale descrizione
- CLI: `pf start-feature <slug> --branch feature/<slug>`
- Plugin esterni: nessuno
- Scrive: branch git + `features/<slug>/context.md` con frontmatter (status: draft, created_at, author) + dir vuote `requirements/` e `plans/`
- Gestione conflitto: se la feature esiste già, la skill mostra warning e chiede se fare checkout silenzioso o abort
- Annuncio: **conferma** (creazione branch = irreversibile)
- Next step suggerito: "invoca `/project-flow:requirements`"

### 7.2 `/project-flow:requirements`

- Dialogo strutturato: purpose → scope → constraints → acceptance criteria
- Se esiste brainstorm recente (in chat o file `.project-flow/shared/brainstorm-*.md`): proposta "uso questo come input?"
- CLI: `pf context --json` + `pf next-number <slug>/requirements`
- Plugin esterni: nessuno (dialogo proprio)
- Scrive: `features/<slug>/requirements/NNN-<label>.md` + aggiorna `context.md`
- Annuncio: **procede** (solo scrittura file = reversibile)

### 7.3 `/project-flow:plan`

- Dialogo breve: chiede scope del piano
- Annuncio: "Sto per usare `superpowers:writing-plans`, output in `plans/NNN-<slug>.md`. Procedo." (reversibile)
- Plugin esterni: `superpowers:writing-plans` con context = requirements correnti
- CLI: `pf next-number <slug>/plans`
- Scrive: `features/<slug>/plans/NNN-<scope>.md` + aggiorna `context.md`

### 7.4 `/project-flow:close-feature`

- Verifica: `pf context --json` + git status (branch pulito)
- Dialogo: riassume lavoro fatto (commit + plans + requirements) e chiede "generare docs?"
- Plugin esterni: opzionale `superpowers:finishing-a-development-branch` per merge flow
- Scrive: `features/<slug>/docs/overview.md`, `implementation.md`, `edge-cases.md` (template riempiti da dialogo); aggiorna `context.md` con `status: closed, closed_at`
- Annuncio: **conferma** (merge = irreversibile)

### 7.5 `/project-flow:man`

- Zero dialogo: lista skill con una-riga ciascuna
- Con argomento: `/project-flow:man plan` → help esteso della skill
- CLI: nessuno
- Plugin esterni: nessuno

## 8. Flussi utente tipici

### Scenario A — Feature piccola, lineare

```
/project-flow:start-feature export-csv
/project-flow:requirements       → requirements/001-initial.md
/project-flow:plan               → plans/001-export-csv.md
[implementazione]
/project-flow:close-feature      → docs/* + merge
```

### Scenario B — Feature grande con brainstorm + multi-plan

```
/project-flow:start-feature auth
/superpowers:brainstorming       (a mano, idea ambigua)
/project-flow:requirements       → 001-initial.md (assorbe brainstorm)
/project-flow:plan (scope: API)  → plans/001-auth-api.md
[implementi API]
/project-flow:requirements       → 002-addendum-2fa.md (emerge in corso)
/project-flow:plan (scope: UI)   → plans/002-auth-ui.md
[implementi UI]
/project-flow:close-feature
```

### Scenario C — Resume sessione

```
git checkout feature/auth
[nuova sessione Claude Code]
[SessionStart hook: "project-flow: feature auth, 2 req, 2 plans"]
/project-flow:man                (se non ricordi i comandi)
Claude legge context.md + ultimo plan prima di rispondere
[continui]
```

Il `context.md` della feature è il punto di ripresa: ogni sessione ri-inizia col quadro completo senza rileggere tutto.

## 9. Pattern annuncio (ibrido C)

### Azioni che **procedono** con annuncio (reversibili)

- Dialogo e raccolta dati
- Scrittura file markdown in `.project-flow/`
- Lettura file e git status
- Invocazione di skill di plugin esterni che producono solo testo/draft

### Azioni che **chiedono conferma** (irreversibili)

- Creazione/checkout branch git
- Commit
- Merge, PR, push
- Cancellazione file
- Archiviazione feature

### Override via config (v1.1, predisposto in v1)

`config.md` → `announce_default: always-confirm | always-proceed` + override per-skill.

## 10. Migrazione dal plugin attuale

Il plugin attuale (`V1_Db_Only` locale, `rebuild structure` su GitHub) verrà **smontato completamente** prima della ricostruzione. Il piano implementativo (prossimo step) dovrà:

1. **Conservare**: nulla del codice attuale. Il design v1 ha topologia troppo diversa (no DB, no dashboard, no MCP). Unici asset riutilizzabili: il contenuto discorsivo di alcune `SKILL.md` attuali (es. `feature-requirements`, `feature-init`) come ispirazione per i dialoghi delle nuove skill.
2. **Migrazione dati utente**: se l'utente ha dati in `~/Documents/DevAiMemory/Projects/` dal plugin attuale, il piano dovrà prevedere uno script one-shot `pf migrate-legacy` che li converte in struttura `.project-flow/`. Se non ci sono dati, skippare.
3. **Versioning**: bump a **0.2.0** come breaking change. 1.0.0 si riserva al dopo-v1.1 consolidato.
4. **Rollback**: tag git `pre-v1-redesign` sul commit attuale (`V1_Db_Only`) prima di iniziare, per poter tornare indietro in caso di blocco.

## 11. Principi non negoziabili (contratto)

1. **No DB, no MCP, no dashboard**: filesystem markdown + git sono la fonte di verità
2. **CLI `pf` <200 LOC in v1**: se ci avviciniamo, ci fermiamo e riconsideriamo prima di aggiungere
3. **Skill = dialogo e orchestrazione, CLI = determinismo**: confine netto, mai sovrapporsi
4. **Annuncio sempre prima di azioni**: mai routing silenzioso
5. **Config.md opzionale per funzionare, obbligatorio per override**: il plugin funziona con default anche senza config custom
6. **Scope v1 stretto**: ogni tentazione di aggiungere skill/feature viene spostata in v1.1 o v2

## 12. Non-goal

- Non è un project manager (no tracking task granulare, no assegnazioni, no Gantt)
- Non è un knowledge manager cross-project (eventuale plugin orchestratore futuro)
- Non sostituisce git (non gestisce versioning del codice, solo dei documenti di flusso)
- Non sostituisce un CI/CD (non lancia test, non fa deploy)
- Non si integra con Jira/Linear/GitHub Issues nativamente (v2 eventuale)
