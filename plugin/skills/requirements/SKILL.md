---
name: requirements
description: Collect or update feature requirements through structured dialog. Creates numbered file in .project-flow/features/<slug>/requirements/ and appends entry to context.md.
---

# requirements

Dialog-driven requirements collection for the currently active feature.

## Usage

- `/project-flow:requirements` — starts new requirements dialog (initial if first, addendum if subsequent)

## Preconditions

1. A feature is active: `pf context --json` returns non-null `feature`. If null, instruct user to invoke `/project-flow:start-feature` first.

## Procedure

1. **Resolve context**: `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` → read `feature`, `feature_dir`
2. **Check for recent brainstorm**: look in current chat for a recent `/superpowers:brainstorming` output or in `<feature_dir>/../../shared/brainstorm-*.md`. If found, ask:
   > "I see a brainstorm output. Use it as input for requirements?"
3. **Determine label**: if directory `requirements/` is empty → label is `initial`. Otherwise → ask user for a short slug for the addendum (e.g. `security`, `2fa`, `perf`).
4. **Conduct dialog**: collect purpose → scope → constraints → acceptance criteria. One topic at a time. Prefer multiple choice when possible.
5. **Get next number**: `${CLAUDE_PLUGIN_ROOT}/bin/pf next-number <slug>/requirements` → e.g. `002`
6. **Synthesize markdown**: produce final file content using the template below
7. **Announce intent (reversible action, proceed with announcement)**:
   > "Saving requirements to `<feature_dir>/requirements/NNN-<label>.md`"
8. **Write file** using Write tool
9. **Update context.md**: append line under `## Requirements updates` section — e.g. `- YYYY-MM-DD — 002 addendum (security)`

## Template

```markdown
---
created_at: YYYY-MM-DD
label: <label>
---

# Requirements: <label>

## Purpose
<one paragraph on what this feature achieves>

## Scope
<what's in, what's out>

## Constraints
<technical, business, or timeline>

## Acceptance criteria
- [ ] criterion 1
- [ ] criterion 2
```

## Dialog principles

- One question at a time
- Stop when you have >= 80% confidence the requirement is implementable
- If the user is unclear, propose 2-3 alternatives
- No YAGNI: if the user asks for "also X", ask if it's v1 or later

## Output

Brief summary in chat, link to the file written.
