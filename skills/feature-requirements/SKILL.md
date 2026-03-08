---
name: feature-requirements
description: Collect and validate detailed requirements for the active feature through structured dialogue
---

# Feature Requirements

Collect detailed, structured requirements for the current feature through iterative dialogue until understanding reaches >95%.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch if on `feature/*`)

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect current branch — if `feature/<name>`, use as feature name (unless `$ARGUMENTS` overrides)
3. If no feature name can be determined, ask the user
4. Call `project_flow__feature_get` to verify the feature is registered
   - If not registered, suggest running `/claude-project-flow:feature-init` first and stop
5. Call `project_flow__settings_get` to resolve the docs path:
   - Check `project_overrides[project_name]` first
   - Fall back to `default_projects_path/project_name/`
6. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
7. Verify `FEATURE_DIR` exists — if not, suggest `/claude-project-flow:feature-init`

## Step 2: Check existing state

Read `FEATURE_DIR/context/.requirements-status.json` if it exists:

```json
{
  "status": "incomplete" | "complete",
  "coverage": 0-100,
  "last_updated": "ISO date",
  "completion_reason": "string",
  "pending_questions": ["question1", "question2"]
}
```

### If status is "incomplete":
- Show warning:
  > **Attenzione:** I requisiti di questa feature non sono ancora completi (copertura: X%).
  > Domande ancora aperte:
  > - question1
  > - question2
- Resume the dialogue from where it left off

### If status is "complete":
- Show current coverage and ask:
  > I requisiti sono stati completati (copertura: X%). Vuoi:
  > 1. Rivedere i requisiti esistenti
  > 2. Aggiungere nuovi requisiti
  > 3. Modificare requisiti esistenti
- For options 2 and 3, go to **Step 6: Post-completion changes**

### If file doesn't exist:
- Proceed to Step 3 (fresh start)

## Step 3: Search similar requirements (cross-project)

Before starting the collection, search the knowledge base for similar requirements already defined in other projects.

1. Call `project_flow__knowledge_search` with:
   - `query`: feature name + keywords from `feature-definition.md`
   - `category`: `requirement`
2. If results are found, present them grouped by project:
   > **Requisiti simili trovati in altri progetti:**
   >
   > **Progetto: <project_name>** — Feature: <feature_name>
   > - FR-1: <title> — <brief description>
   > - FR-2: <title> — <brief description>
   > - File: `<file_path>`
   >
   > **Progetto: <other_project>** — Feature: <other_feature>
   > - ...
   >
   > Vuoi:
   > 1. Approfondire una soluzione esistente (leggo i dettagli dal progetto originale)
   > 2. Ignorare e partire da zero con una nuova implementazione
   > 3. Proseguire — tengo presente come riferimento ma non vincola

### Option 1: Deep dive into existing solution
- Read the full `requirements.md` from the matched feature's directory
- If available, also check for plans and implementation notes in the same feature directory
- Present a summary of how the feature was resolved:
  > **Soluzione trovata in {project}/{feature}:**
  > [summary of requirements, approach, key decisions]
- Ask the user:
  > Vuoi:
  > 1. Riusare questi requisiti come base (li copio e adatto)
  > 2. Solo come riferimento — proseguo con raccolta nuova
- If reusing: copy requirements as starting point, mark in changelog as `IMPORTED` with source reference, then go to Step 4 for gap-filling
- If reference only: proceed to Step 4, keep findings as context

### Option 2: Ignore existing
- Proceed to Step 4 with no prior context — the previous solution is not considered

### Option 3: Keep as reference
- Proceed to Step 4 normally — the model can reference the findings when generating questions and requirements, but they don't constrain the new feature

3. If no results found, proceed directly to Step 4

## Step 4: Initial deduction

1. Read `FEATURE_DIR/feature-definition.md` for the description
2. Based on the feature name, description, and any cross-project findings from Step 3, generate an initial deduction:
   - What the feature likely needs to do
   - Key components and interactions
   - Probable technical constraints
   - Likely user-facing behavior
3. Present the deduction to the user:
   > **Deduzione iniziale da "{feature_name}":**
   >
   > [deduction summary as bullet points]
   >
   > Questa è la mia comprensione iniziale. Ora ho bisogno di una descrizione dettagliata da te per costruire i requisiti completi.

## Step 5: Detailed description collection

Ask the user:

> **Descrivi in dettaglio cosa deve fare questa feature.**
> Includi: obiettivi, comportamento atteso, vincoli, edge case noti, e qualsiasi dettaglio che ritieni importante.
> Più informazioni fornisci ora, meno domande saranno necessarie dopo.

After the user responds, analyze the input and estimate a coverage percentage based on:
- **Functional completeness**: Are all behaviors described? (0-30%)
- **Edge cases**: Are failure modes and boundaries covered? (0-20%)
- **Technical constraints**: Are integration points and limitations clear? (0-20%)
- **Acceptance criteria**: Can you write testable pass/fail conditions? (0-15%)
- **Scope boundaries**: Is it clear what's NOT included? (0-15%)

### If coverage >= 95%:
- Go to Step 6 (generate requirements)

### If coverage < 95%:
- Go to Step 5b (structured questions)

## Step 5b: Structured questions

Generate targeted questions to fill the gaps. Present them as a numbered checklist grouped by category:

> **Comprensione attuale: X%.** Ho bisogno di chiarimenti su questi punti:
>
> **Comportamento funzionale:**
> - [ ] 1. [question about missing behavior]
> - [ ] 2. [question about missing behavior]
>
> **Edge case e gestione errori:**
> - [ ] 3. [question about edge case]
>
> **Vincoli tecnici:**
> - [ ] 4. [question about constraints]
>
> **Criteri di accettazione:**
> - [ ] 5. [question about acceptance criteria]
>
> **Confini di scope:**
> - [ ] 6. [question about what's excluded]
>
> Rispondi ai punti che ritieni importanti. Puoi anche dire "non rilevante" per quelli che vuoi saltare.

After each round of answers:
1. Re-evaluate coverage
2. If still < 95%, generate follow-up questions for remaining gaps
3. Maximum 3 rounds of questions — after the third round, proceed to Step 6 with what you have and note gaps explicitly

**Important:** Save progress after each round by updating `.requirements-status.json` with current coverage and remaining questions. This ensures continuity if the session is interrupted.

## Step 6: Generate requirements document

Create `FEATURE_DIR/requirements/requirements.md`:

```markdown
# Requirements: <feature_name>

> Coverage: X% | Status: complete/incomplete | Last updated: <ISO date>

## Functional Requirements

### FR-1: <title>
<description>
**Acceptance criteria:**
- [ ] <testable condition>

### FR-2: <title>
...

## Non-Functional Requirements

### NFR-1: <title>
<description>

## Edge Cases

### EC-1: <title>
<expected behavior>

## Out of Scope
- <explicitly excluded item>

## Open Questions
- <any remaining uncertainty, only if coverage < 95%>

---

## Changelog

| Date | Type | ID | Description |
|------|------|----|-------------|
| <ISO date> | CREATED | ALL | Initial requirements generation |
| <ISO date> | IMPORTED | FR-N | Imported from <project>/<feature> (if applicable) |
```

**Changelog types:**
- `CREATED` — Initial generation
- `IMPORTED` — Requirement imported from another project (with source reference)
- `ADDED` — New requirement added post-completion
- `MODIFIED` — Existing requirement changed
- `REMOVED` — Requirement removed (strikethrough, not deleted)

After generating:
1. Present the full document to the user for review
2. Incorporate feedback
3. Save the final version

## Step 7: Post-completion changes

When adding or modifying requirements after initial completion:

### Adding new requirements:
1. Ask the user to describe the new requirement
2. Assign the next sequential ID (FR-N, NFR-N, EC-N)
3. Add to the appropriate section
4. **Append to changelog:**
  ```
  | <ISO date> | ADDED | FR-N | <brief description> |
  ```

### Modifying existing requirements:
1. Show the current requirement
2. Ask what needs to change
3. Apply the modification
4. **Append to changelog:**
  ```
  | <ISO date> | MODIFIED | FR-N | <what changed and why> |
  ```

### Removing requirements:
1. Don't delete — mark as struck through with reason
2. **Append to changelog:**
  ```
  | <ISO date> | REMOVED | FR-N | <reason for removal> |
  ```

After any change, re-evaluate coverage and update `.requirements-status.json`.

## Step 8: Finalize status

Update `FEATURE_DIR/context/.requirements-status.json` with final state.

### If coverage >= 95% (complete):
```json
{
  "status": "complete",
  "coverage": <percentage>,
  "last_updated": "<ISO date>",
  "completion_reason": "All requirement areas sufficiently covered",
  "pending_questions": []
}
```

### If coverage < 95% (incomplete):
```json
{
  "status": "incomplete",
  "coverage": <percentage>,
  "last_updated": "<ISO date>",
  "completion_reason": null,
  "pending_questions": ["remaining question 1", "remaining question 2"]
}
```

## Step 9: Index requirements in knowledge base

When requirements are complete (coverage >= 95%) or after any post-completion change, index the requirements into the knowledge base for cross-project search.

Call `project_flow__knowledge_index` with:
- `path`: `FEATURE_DIR/requirements/requirements.md`

This makes the requirements searchable from other projects via `knowledge_search`, enabling Step 3's cross-project discovery.

**Knowledge entry metadata:**
- `project`: current project name
- `category`: `requirement`
- `title`: `Requirements: <feature_name>`
- `content`: full requirements document text

> This indexing is what powers the cross-project search in Step 3. Every completed requirements set becomes discoverable by future features across all projects.

## Step 10: Update feature in DB

Call `project_flow__feature_update` with:
- `project`: project name
- `name`: feature name
- `status`: `requirements-done` if complete, keep current status if incomplete

## Step 11: Report

> **Requisiti {feature_name}:** {status}
> - Copertura: X%
> - Requisiti funzionali: N
> - Requisiti non-funzionali: N
> - Edge case: N
> - File: `requirements/requirements.md`
>
> {if incomplete: "Riprendi con `/claude-project-flow:feature-requirements` nella prossima sessione."}
> {if complete: "Prossimo passo: pianificazione implementazione."}
