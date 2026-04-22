---
name: close-feature
description: Close the active feature — generate final docs (overview, implementation, edge-cases), optionally merge branch, mark status=closed in context.md.
---

# close-feature

Finalize a feature: generate documentation, optionally merge, archive.

## Usage

- `/project-flow:close-feature` — runs on the currently active feature

## Preconditions

1. Active feature (`pf context --json` → `feature != null`)
2. Git status clean (uncommitted changes → warn, offer to commit first)

## Procedure

### Part A — docs generation

1. **Gather data**: read `context.md`, all `requirements/*`, all `plans/*`, `git log` since branch created
2. **Dialog to enrich**: ask user:
   - What were the key design decisions?
   - Any notable edge cases handled?
   - Anything that changed vs original plan?
3. **Synthesize three docs** using Write tool:
   - `<feature_dir>/docs/overview.md` — what this feature does, why it exists
   - `<feature_dir>/docs/implementation.md` — how it was built, key files, patterns
   - `<feature_dir>/docs/edge-cases.md` — edge cases handled, known limitations
4. Create docs/ directory if it doesn't exist

### Part B — merge decision

Ask user which option:

1. **Merge to main now** (this session handles merge)
2. **Open PR** (runs `gh pr create` if gh is installed)
3. **Just close, merge later** (manual merge by user)
4. **Abort merge, just generate docs**

For option 1 or 2: **announce irreversible action, ask confirmation**:
> "Ready to merge feature/<slug> to main. Confirm? (y/N)"

If confirmed, execute via git commands or gh.

### Part C — mark closed

Update `<feature_dir>/context.md` frontmatter:
```
status: closed
closed_at: YYYY-MM-DD
```

Append under `## Sessions`:
- `YYYY-MM-DD — feature closed`

## Templates

### overview.md

```markdown
# Overview: <slug>

## Purpose
<one paragraph: what this feature achieves, for whom>

## Scope
<what it does and doesn't do>

## User-facing summary
<plain language, no jargon>
```

### implementation.md

```markdown
# Implementation: <slug>

## Architecture
<2-3 paragraphs describing approach>

## Key files
- `path/file1.ts` — <role>
- `path/file2.ts` — <role>

## Patterns used
<design patterns, conventions followed>

## Dependencies added
<new libraries, external services>
```

### edge-cases.md

```markdown
# Edge cases: <slug>

## Handled
- <case 1>: <mitigation>
- <case 2>: <mitigation>

## Known limitations
<what's explicitly not covered>

## Future considerations
<items for v2 or later>
```

## Output

Summary of docs created + merge outcome + path to context.md for final status check.
