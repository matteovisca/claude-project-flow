---
name: session-save
description: Sync development progress with feature docs — update requirements, mark plan steps, and log session context
---

# Session Save

Analyze the current session's work against the feature's requirements, plans, and context.
Sync the feature docs to reflect what was actually done.

## Trigger

- Manually invoked by the user at any point during or at the end of a session
- The session-stop hook shows a reminder if on a feature branch and there are uncommitted or unsynced changes

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__settings_get` to resolve docs path
4. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
5. Verify feature exists in DB via `project_flow__feature_get`

## Step 2: Gather session diff

Run git commands to understand what changed in this session:

1. `git diff HEAD` — unstaged and staged changes
2. `git diff <branch_base>..HEAD` — all commits on this feature branch since divergence from base
3. `git log <branch_base>..HEAD --oneline` — commit history on the feature branch
4. `git status --short` — current working tree state

Combine into a **session delta**: a structured understanding of what files were created, modified, deleted, and what the changes do semantically.

## Step 3: Load current feature state

Read all existing feature docs:

1. `FEATURE_DIR/requirements/requirements.md` — current requirements (if exists)
2. `FEATURE_DIR/context/.plans-status.json` — plans tracking state
3. `FEATURE_DIR/plans/*.md` — active plan files (read only those with status `active` from plans-status)
4. `FEATURE_DIR/context/session-log.md` — previous session logs (if exists)
5. `FEATURE_DIR/context/.requirements-status.json` — requirements completion state

If none of these files exist, warn:
> Nessun documento di feature trovato. Esegui prima `/claude-project-flow:feature-requirements` o `/claude-project-flow:feature-plan`.

But still proceed — the session log can be created even without requirements/plans.

## Step 4: Analyze coverage

Compare the session delta against the feature docs to determine:

### 4a: Plan progress
If a plan exists, for each phase/step:
- Check if the git diff contains changes that **complete** that step
- Check if changes **partially** address a step
- Mark each step as: `done`, `partial`, `not started`

Present to the user:
> **Avanzamento piano:**
>
> ### Phase 1: <title>
> - [x] Step 1 — completato (file: x.ts, y.ts)
> - [~] Step 2 — parziale (manca: <what's missing>)
> - [ ] Step 3 — non iniziato
>
> ### Phase 2: <title>
> - [ ] Step 1 — non iniziato

Ask user to confirm or adjust the assessment.

### 4b: Requirements impact
Analyze the diff for changes that:
- **Fulfill** existing requirements → note which FR/NFR/EC are addressed
- **Add implicit new requirements** → new behaviors not in the original requirements
- **Change architecture** → structural decisions that affect existing requirements
- **Invalidate** existing requirements → changes that make a requirement obsolete

Present findings:
> **Impatto sui requisiti:**
>
> **Requisiti coperti:**
> - FR-1: <title> — implementato in `src/x.ts`
> - FR-3: <title> — parzialmente coperto
>
> **Nuovi requisiti rilevati:**
> - Il diff introduce <behavior> non previsto nei requisiti originali
>
> **Cambi architetturali:**
> - <description of architectural change>
>
> Vuoi aggiornare i requisiti? (sì/no)

### 4c: Unplanned work
Identify changes that don't map to any requirement or plan step:
- Bug fixes discovered during implementation
- Refactoring done for code quality
- Infrastructure/tooling changes

## Step 5: Apply updates

Based on user confirmation from Step 4:

### 5a: Update plans (if active plans exist)
For each active plan in `.plans-status.json`:
1. Read the plan file and update checkbox states:
   - `- [ ]` → `- [x]` for completed steps, append ` (done: <date>)`
   - `- [ ]` → `- [~]` for partial steps, append ` (partial: <what's done>)`
2. Recount `done` and `total` in `.plans-status.json`
3. If all steps are done, mark plan as `completed` and update status line in the plan file

### 5b: Update requirements (if user confirmed)
For new requirements detected:
- Add to `requirements.md` with next sequential ID
- Mark in changelog as `ADDED` with `source: session-save auto-detected`

For architectural changes:
- Update affected requirements
- Mark in changelog as `MODIFIED` with `source: session-save architectural change`

For fulfilled requirements:
- Don't modify the requirement text
- Track in session log (Step 5c)

Update `.requirements-status.json` coverage if it changed.

### 5c: Write session log
Append to `FEATURE_DIR/context/session-log.md`:

```markdown
## Session: <ISO date>

### Summary
<2-3 sentences describing what was accomplished>

### Commits
- `<hash>` <message>
- `<hash>` <message>

### Files changed
- `src/x.ts` — <what changed>
- `src/y.ts` — <what changed>

### Requirements addressed
- FR-1: <title> — done
- FR-3: <title> — partial

### Plan steps completed
- Phase 1 / Step 1: <title>
- Phase 1 / Step 2: <title> (partial)

### Unplanned work
- <description>

### Open items for next session
- <what's left to do>
- <blockers encountered>
```

## Step 6: Index updates

If requirements were modified, call `project_flow__knowledge_index` with:
- `path`: `FEATURE_DIR/requirements/requirements.md`
- `project`: project name

## Step 7: Update feature status in DB

Determine the appropriate status based on progress:
- If all plan steps are done → `implementation-done`
- If plan exists and some steps are done → `in-progress`
- If only requirements exist → keep current status

Call `project_flow__feature_update` with the new status.

## Step 8: Report

> **Session salvata per {feature_name}**
>
> | | |
> |---|---|
> | **Piano** | X/Y step completati |
> | **Requisiti** | N coperti, M aggiunti, K modificati |
> | **Session log** | aggiornato |
> | **Status** | `<new_status>` |
>
> **Prossima sessione:**
> - <top priority items from open items>
