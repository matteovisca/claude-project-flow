---
name: feature-merge
description: Merge a completed feature branch into the main branch, update project docs, and archive the feature
---

# Feature Merge

Merge a feature branch into the main development branch.
Pull latest changes, verify consistency, perform the merge, integrate documentation into the project, and mark the feature as implemented.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature and context

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__feature_get` to verify feature exists and get its state
4. Call `project_flow__settings_get` to resolve docs path
5. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
6. Determine the main branch (try `main`, then `master`, then `develop`)

## Step 2: Pre-merge checks

### 2a: Feature completeness
Check the feature state:
- Read `.requirements-status.json` — are requirements complete?
- Read `.plans-status.json` — are all plans completed?
- Check if `docs/feature-doc.md` exists — is documentation generated?

If documentation is missing:
> **La documentazione non è stata generata.**
> Vuoi:
> 1. Generare la documentazione adesso (eseguo `/claude-project-flow:feature-docs`)
> 2. Procedere senza documentazione

If requirements or plans are incomplete, warn but allow proceeding:
> **Warning:** La feature ha requisiti/piani incompleti.
> Vuoi procedere comunque con il merge?

### 2b: Working tree clean
Run `git status --short`:
- If there are uncommitted changes:
  > Ci sono modifiche non committate. Committale prima di procedere con il merge.
  - Stop and wait for the user to commit

### 2c: Current branch
Verify we are on the feature branch:
- If not on `feature/<name>`, ask to switch:
  > Non sei sul branch della feature. Passo a `feature/<name>`?

## Step 3: Pull latest main

```
git fetch origin
git pull origin <main_branch>
```

Show what changed on main since the feature branch diverged:
> **Aggiornamenti dal branch `<main>`:**
> - X commit nuovi
> - Y file modificati
>
> Procedo con il merge di `<main>` nel branch feature?

## Step 4: Merge main into feature (forward merge)

```
git merge <main_branch>
```

### If merge succeeds (no conflicts):
> Merge di `<main>` in `feature/<name>` completato senza conflitti.

### If merge conflicts:
Show conflicting files:
> **Conflitti rilevati:**
> - `src/file1.ts`
> - `src/file2.ts`
>
> Risolvi i conflitti e committa, poi richiama `/claude-project-flow:feature-merge` per proseguire.

Help resolve conflicts if the user asks, then continue.

## Step 5: Verify post-merge state

After the forward merge succeeds:

1. Run `git diff <main_branch>..HEAD --stat` to see the final delta
2. Present a summary:
   > **Diff finale feature → main:**
   > - N file modificati
   > - X inserzioni, Y cancellazioni
   >
   > File principali:
   > - `src/...` — <description>
   > - `src/...` — <description>
   >
   > Tutto in ordine. Procedo con il merge su `<main>`?

Wait for user confirmation before proceeding.

## Step 6: Merge feature into main

```
git checkout <main_branch>
git merge feature/<name>
```

This should be a fast-forward or clean merge since we already resolved conflicts in Step 4.

> Merge di `feature/<name>` su `<main>` completato.

**Do NOT push** — leave that to the user. Just inform:
> Il push non è stato eseguito. Quando sei pronto: `git push origin <main>`

## Step 7: Integrate documentation

If `FEATURE_DIR/docs/project-doc-section.md` exists:

1. Locate the project's documentation directory:
   - Check `FEATURE_DIR/../../docs/` in the docs path
   - Check repo root: `docs/`, `doc/`
   - If none found, ask the user where to put it

2. Determine the feature version:
   - Count existing `Archive/v*` folders to get version number
   - The document will be named/tagged with the feature name

3. Append or merge the section into the project documentation:
   - If a project docs index exists (e.g. `docs/README.md` or `docs/index.md`), add a link
   - Save the feature doc section as `docs/features/<feature_name>.md` (or similar structure)

4. Present the result:
   > **Documentazione integrata:**
   > - Aggiunta sezione in `docs/features/<feature_name>.md`
   > - Aggiornato indice in `docs/README.md`

If `project-doc-section.md` doesn't exist but `feature-doc.md` does:
> La sezione per la docs del progetto non è stata generata.
> Vuoi che la creo adesso dalla documentazione della feature?

## Step 8: Archive feature docs

In the feature docs directory:

1. Determine version number (next `vN` in `Archive/`)
2. Move all root-level content (except `Archive/`) into `Archive/vN/`:
   ```
   FEATURE_DIR/
   ├── Archive/
   │   └── vN/
   │       ├── feature-definition.md
   │       ├── requirements/
   │       ├── plans/
   │       ├── context/
   │       └── docs/
   └── (empty — ready for potential future iteration)
   ```
3. Log:
   > Feature `<name>` archiviata in `Archive/vN/`

## Step 9: Update DB

Call `project_flow__feature_update` with:
- `project`: project name
- `name`: feature name
- `status`: `implemented`

## Step 10: Index final state

Call `project_flow__knowledge_index` with:
- `path`: `FEATURE_DIR/Archive/vN/docs/feature-doc.md`
- `project`: project name

This ensures the final version of the documentation is searchable cross-project.

## Step 11: Cleanup

Ask the user:
> Vuoi eliminare il branch `feature/<name>`?
> 1. Sì, elimina il branch locale
> 2. No, mantieni il branch

If yes: `git branch -d feature/<name>`

## Step 12: Report

> **Feature merge completato: {feature_name}**
>
> | | |
> |---|---|
> | **Branch** | `feature/<name>` → `<main>` |
> | **Docs progetto** | integrata in `docs/features/<name>.md` |
> | **Feature docs** | archiviata in `Archive/vN/` |
> | **Status DB** | `implemented` |
> | **Knowledge base** | indicizzata |
> | **Branch feature** | eliminato / mantenuto |
>
> **Reminder:** Il push non è stato eseguito.
> ```
> git push origin <main>
> ```
