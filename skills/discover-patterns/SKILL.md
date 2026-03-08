---
name: discover-patterns
description: Detect new patterns, libraries, and dependency changes from git diff and save them to feature context and knowledge base
---

# Discover Patterns

Analyze the current git diff to detect new patterns, newly introduced libraries, and dependency changes.
Save discoveries to the feature context and index them in the knowledge base for cross-project reuse.

## Trigger

- **Automatic:** `SessionEnd` hook runs analysis and saves pending discoveries
- **Manual:** User invokes this skill at any time during a session

When invoked manually, the analysis is interactive — the user can review, confirm, and enrich each discovery.
When triggered by the hook, discoveries are saved as pending and presented at the next session start.

## Parameters
- `$ARGUMENTS` — Feature name (optional, detected from branch)

## Step 1: Resolve feature and paths

1. Detect project name from git root basename
2. Detect feature name from branch (`feature/<name>`) or `$ARGUMENTS`
3. Call `project_flow__settings_get` to resolve docs path
4. Set `FEATURE_DIR` = `<resolved_path>/features/<feature_name>/`
5. If not on a feature branch or feature dir doesn't exist, still proceed — discoveries can be project-level

## Step 2: Gather diff

Determine the scope of changes to analyze:

1. `git diff HEAD` — current uncommitted changes
2. `git log --oneline -20` — recent commits for context
3. `git diff <merge-base>..HEAD` — all changes on the feature branch (if on a feature branch)

Also check:
4. `git diff <merge-base>..HEAD -- package.json package-lock.json requirements.txt Pipfile pyproject.toml Cargo.toml go.mod pom.xml *.csproj` — dependency file changes specifically

## Step 3: Analyze for discoveries

Scan the diff for three categories:

### 3a: New dependencies
Parse dependency file diffs to extract:
- **Added** packages (name + version)
- **Removed** packages
- **Updated** packages (old version → new version)
- **Major version bumps** (potentially breaking)

For each new dependency, note:
- Why it was likely introduced (infer from surrounding code changes)
- Which files import/use it

### 3b: New patterns
Analyze code changes for architectural or design patterns not previously used in the project:
- New abstractions (base classes, interfaces, generics)
- New structural patterns (repository pattern, factory, observer, etc.)
- New error handling approaches
- New testing patterns
- New API patterns (middleware, decorators, hooks)
- New file/folder structure conventions

For each pattern, note:
- Where it was introduced (files + line ranges)
- What problem it solves
- Whether it's a one-off or should become a project convention

### 3c: Convention changes
Detect shifts in coding conventions:
- New naming conventions
- New file organization patterns
- New import styles
- New configuration approaches

## Step 4: Present discoveries (interactive mode)

When invoked manually, present findings for review:

> **Scoperte dalla sessione:**
>
> **Nuove dipendenze:**
> | Pacchetto | Versione | Motivo probabile |
> |-----------|----------|-----------------|
> | `zod` | ^3.22.0 | Validazione schema input MCP tools |
> | `better-sqlite3` | ^11.0.0 | Aggiornamento major (era ^10.x) |
>
> **Nuovi pattern:**
> - **Upsert pattern** in `mcp-server.ts` — SELECT then INSERT/UPDATE instead of ON CONFLICT. Usato per feature_update.
> - **Hook-based CLI routing** in `mcp-server.ts` — process.argv[2] dispatch per hook vs MCP mode
>
> **Cambi di convenzione:**
> - Nessuno rilevato
>
> Per ogni scoperta, vuoi:
> 1. Confermare e salvare nella knowledge base
> 2. Ignorare (non rilevante)
> 3. Arricchire con note aggiuntive

For each confirmed discovery, ask:
> Questa scoperta dovrebbe diventare una **convenzione di progetto** (applicare sempre) o è specifica di questa feature?

## Step 5: Save discoveries

### 5a: Feature context
Write/update `FEATURE_DIR/context/discoveries.md`:

```markdown
# Discoveries: <feature_name>

## Session: <ISO date>

### New Dependencies
- **zod** (^3.22.0) — Schema validation for MCP tool inputs
  - Files: `src/server/mcp-server.ts`
  - Reason: Type-safe input validation

### New Patterns
- **Upsert pattern** — Check existence then INSERT or UPDATE
  - Files: `src/server/mcp-server.ts:161-176`
  - Context: Used for feature_update tool to handle both creation and modification
  - Convention: feature-specific / project-wide

### Convention Changes
- (none)

---
<!-- Previous sessions appended below -->
```

### 5b: Pending discoveries (hook mode)
When triggered by the SessionEnd hook, save to `FEATURE_DIR/context/.pending-discoveries.json`:

```json
{
  "session_date": "ISO date",
  "dependencies": [
    {
      "name": "zod",
      "version": "^3.22.0",
      "action": "added",
      "reason": "Schema validation for MCP tool inputs",
      "files": ["src/server/mcp-server.ts"]
    }
  ],
  "patterns": [
    {
      "name": "Upsert pattern",
      "description": "Check existence then INSERT or UPDATE",
      "files": ["src/server/mcp-server.ts"],
      "lines": "161-176",
      "scope": "unknown"
    }
  ],
  "conventions": []
}
```

## Step 6: Cleanup pending file

If `.pending-discoveries.json` exists (i.e., this was triggered from a pending review):
1. Delete `FEATURE_DIR/context/.pending-discoveries.json`
2. This prevents the session-start warning from reappearing

## Step 7: Index in knowledge base

For each confirmed discovery, call `project_flow__knowledge_index` to make it searchable cross-project.

If the discovery is marked as a **project convention**, also save it as a standalone knowledge file:
- Path: `<knowledge_path>/conventions/<project>-<pattern-name>.md` (if knowledge paths are configured)
- Category: `convention` or `pattern` or `library`

This ensures that when another project introduces similar code, `feature-requirements` Step 3 and `feature-plan` Step 3c can find it.

## Step 8: Report

> **Scoperte registrate per {feature_name}:**
>
> | Tipo | Quantità | Indicizzate |
> |------|----------|-------------|
> | Dipendenze | N | si/no |
> | Pattern | M | si/no |
> | Convenzioni | K | si/no |
>
> Salvate in `context/discoveries.md`.
> {if project conventions added: "Nuove convenzioni aggiunte alla knowledge base."}
