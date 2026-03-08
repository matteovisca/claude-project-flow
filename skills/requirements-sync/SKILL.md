---
name: requirements-sync
description: Scan the requirements folder for new or modified source documents, align requirements.md, and track file hashes
---

# Requirements Sync

Scan the feature's `requirements/` folder for source documents (PDF, Word, images, markdown, etc.).
Compare against a hash registry to detect new or modified files.
Read new/changed documents, align `requirements.md`, and update the knowledge base.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__settings_get` to resolve docs path
4. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
5. Set `REQ_DIR` = `FEATURE_DIR/requirements/`
6. Verify both exist

## Step 2: Load hash registry

Read `FEATURE_DIR/context/.requirements-sources.json` if it exists:

```json
{
  "sources": [
    {
      "file": "api-spec.pdf",
      "hash": "md5-hash",
      "last_scanned": "ISO date",
      "type": "pdf",
      "requirements_derived": ["FR-5", "FR-6", "NFR-2"]
    }
  ]
}
```

If the file doesn't exist, initialize as `{ "sources": [] }`.

## Step 3: Scan requirements folder

List all files in `REQ_DIR/` (non-recursive, skip hidden files and `requirements.md` itself).

Supported file types and how to read them:
- **`.md`** — Read directly as text
- **`.pdf`** — Read using the Read tool (which supports PDF natively)
- **`.docx` / `.doc`** — Read using the Read tool or extract text via command line (`textutil -convert txt` on macOS)
- **`.png` / `.jpg` / `.jpeg` / `.webp`** — Read using the Read tool (multimodal — describe visual content, extract text from screenshots/diagrams)
- **`.txt`** — Read directly as text
- **`.csv` / `.xlsx`** — Read and interpret as structured data
- **Other** — Warn and skip, suggest the user convert to a supported format

For each file, compute MD5 hash and compare against the registry:

### Classification:
- **NEW** — file not in registry → must be read and analyzed
- **MODIFIED** — file in registry but hash differs → must be re-read
- **UNCHANGED** — file in registry with matching hash → skip
- **REMOVED** — file in registry but no longer on disk → flag for review

Present scan results:
> **Scan cartella requirements:**
>
> | File | Stato | Tipo |
> |------|-------|------|
> | `api-spec.pdf` | NUOVO | pdf |
> | `wireframes.png` | MODIFICATO | image |
> | `notes.md` | invariato | md |
> | `old-spec.docx` | RIMOSSO | docx |
>
> Procedo con la lettura dei file nuovi/modificati?

## Step 4: Read and analyze documents

For each NEW or MODIFIED file:

1. Read the file content using the appropriate method (Step 3)
2. Extract key information:
   - Functional requirements described or implied
   - Non-functional requirements (performance, security, etc.)
   - Constraints or technical specifications
   - Edge cases or special scenarios
   - Acceptance criteria
3. Summarize findings per file:
   > **Da `api-spec.pdf`:**
   > - Endpoint POST /users richiede validazione email
   > - Rate limiting 100 req/min per utente
   > - Formato risposta deve seguire JSON:API spec

## Step 5: Load and compare existing requirements

Read `REQ_DIR/requirements.md` (the current requirements document).

For each finding from Step 4, classify:
- **Already covered** — an existing requirement already captures this → note the match
- **New requirement** — not covered by any existing requirement → propose as addition
- **Conflict** — contradicts an existing requirement → flag for resolution
- **Refinement** — adds detail to an existing requirement → propose update

Present the analysis:
> **Allineamento con requirements esistenti:**
>
> **Già coperti:**
> - FR-1 copre "validazione email" da `api-spec.pdf`
>
> **Nuovi requisiti da aggiungere:**
> - Da `api-spec.pdf`: Rate limiting 100 req/min → proposto come NFR-3
> - Da `wireframes.png`: Modale di conferma su eliminazione → proposto come FR-8
>
> **Conflitti:**
> - FR-2 dice "formato XML" ma `api-spec.pdf` specifica JSON:API → quale prevale?
>
> **Raffinamenti:**
> - FR-4 può essere arricchito con i dettagli da `api-spec.pdf` pagina 12
>
> Confermi le modifiche? Puoi anche scegliere singolarmente.

## Step 6: Apply updates to requirements.md

Based on user confirmation:

### New requirements:
Add with next sequential ID, include source reference:
```markdown
### FR-8: Modale di conferma eliminazione
L'utente deve confermare tramite modale prima di eliminare un record.
**Source:** `wireframes.png` (hash: abc123)
**Acceptance criteria:**
- [ ] Modale appare su click "Elimina"
- [ ] Richiede conferma esplicita
```

### Refinements:
Update the existing requirement text, append source:
```markdown
### FR-4: Formato risposta API
... testo aggiornato con dettagli ...
**Source:** `api-spec.pdf` p.12 (hash: def456)
```

### Conflicts:
For each conflict, ask the user which source prevails, then update accordingly.

### Changelog entries:
Append to the changelog table in requirements.md:

| Date | Type | ID | Description |
|------|------|----|-------------|
| <ISO date> | ADDED | FR-8 | From wireframes.png — modale conferma eliminazione |
| <ISO date> | MODIFIED | FR-4 | Refined from api-spec.pdf p.12 |
| <ISO date> | CONFLICT-RESOLVED | FR-2 | Changed from XML to JSON:API per api-spec.pdf |

## Step 7: Handle removed files

For files in the registry but no longer on disk:
> **File rimossi dalla cartella:**
> - `old-spec.docx` — era sorgente di: FR-3, FR-4
>
> I requisiti derivati restano validi o vanno rivisti?
> 1. Mantieni i requisiti (il file è stato solo spostato/archiviato)
> 2. Segna i requisiti per revisione

If option 2: add a note to each affected requirement:
```markdown
> **Review needed:** source file `old-spec.docx` removed on <date>
```

## Step 8: Update hash registry

Write updated `FEATURE_DIR/context/.requirements-sources.json`:
- Add entries for NEW files with their hash and derived requirements
- Update hash and `last_scanned` for MODIFIED files
- Remove entries for REMOVED files (if user confirmed removal)
- Keep UNCHANGED entries as-is

## Step 9: Update requirements status

Re-evaluate coverage in `FEATURE_DIR/context/.requirements-status.json`:
- If new requirements were added, coverage may have decreased (new unknowns)
- If refinements clarified existing requirements, coverage may have increased
- Update the `last_updated` timestamp

## Step 10: Index in knowledge base

Call `project_flow__knowledge_index` with:
- `path`: `REQ_DIR/requirements.md`
- `project`: project name

## Step 11: Report

> **Sync completato per {feature_name}**
>
> | | |
> |---|---|
> | **File scansionati** | N totali (X nuovi, Y modificati, Z invariati) |
> | **Requisiti aggiunti** | N |
> | **Requisiti aggiornati** | M |
> | **Conflitti risolti** | K |
> | **Copertura** | X% |
>
> File sorgente tracciati con hash in `.requirements-sources.json`.
> Usa `/claude-project-flow:requirements-sync` dopo aver aggiunto nuovi documenti.
