---
name: plan
description: Create an implementation plan for the active feature. Delegates to superpowers:writing-plans when installed, falls back to inline dialog otherwise. Saves to .project-flow/features/<slug>/plans/NNN-<scope>.md
---

# plan

Produce an implementation plan for the active feature.

## Usage

- `/project-flow:plan` — create a new plan (optionally ask scope: API, UI, DB, etc.)

## Preconditions

1. An active feature (`pf context --json` → `feature != null`)
2. At least one requirements file exists in `<feature_dir>/requirements/`

## Procedure

1. **Resolve context**: `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` → feature, plugins mapping
2. **Ask scope** (short label, e.g. `api`, `ui`, `migration`). This becomes the filename slug.
3. **Load requirements**: read all files in `<feature_dir>/requirements/`, concatenate as context
4. **Get next number**: `pf next-number <slug>/plans` → e.g. `003`
5. **Determine target path**: `<feature_dir>/plans/NNN-<scope>.md`
6. **Detect superpowers**: check if `superpowers:writing-plans` is available. Check `config.md` `plugins.plan` for mapping.
7. **Announce intent (reversible, proceed with announcement)**:
   > "Using superpowers:writing-plans. Output will be saved to `<target_path>`. Proceeding."
8. **Invoke the mapped plan skill**: pass requirements as context
9. **Intercept output**: when the plan skill finishes, capture its output (should be a markdown plan)
10. **Save to target path** using Write tool (NOT to the default superpowers path)
11. **Update context.md**: append line under `## Plans` — e.g. `- YYYY-MM-DD — 003 (scope: api)`

## If superpowers is not installed

Fall back to inline dialog following writing-plans principles:
- Ask for goal, architecture sketch
- Break into bite-sized tasks (2-5 min each)
- Apply TDD pattern where applicable
- Save to same target path

## Post-conditions

- File `<feature_dir>/plans/NNN-<scope>.md` exists
- `context.md` updated

## Output

Path to plan file + brief summary of plan structure.
