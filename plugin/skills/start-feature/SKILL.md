---
name: start-feature
description: Initialize a new feature — create git branch and scaffold .project-flow/features/<slug>/ structure. Use when starting work on a new feature or user story.
---

# start-feature

Start a new feature in the current project. Creates git branch and scaffolds the feature directory.

## Usage

- `/project-flow:start-feature <slug>` — slug becomes both branch suffix (per config) and directory name

## Preconditions

1. The current directory is a git repo
2. `.project-flow/config.md` exists (if not, propose creating it first — see "Bootstrap" below)
3. Working tree is clean (or warn user)

## Procedure

1. **Read context**: run `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` to confirm project is recognized.
2. **Validate slug**: reject if contains spaces, uppercase letters, or special characters other than `-` and `_`.
3. **Ask for optional one-line description** (skip if user provides it upfront).
4. **Announce intent** (this is an irreversible action — ask for confirmation):
   > "I'll create branch `feature/<slug>` and scaffold `.project-flow/features/<slug>/`. Confirm?"
5. **Invoke CLI**: `${CLAUDE_PLUGIN_ROOT}/bin/pf start-feature <slug> --branch feature/<slug> --json`
6. **Parse output**: on success, extract `slug`, `branch`, `featureDir`.
7. **Suggest next step**: tell user to invoke `/project-flow:requirements` to collect initial requirements.

## Bootstrap case

If `pf context` returns `error: config.md not found`:
- Infer defaults: project name from git remote URL basename or current dir name; family=`standalone`; branch pattern=`feature/<slug>`
- Offer to write `.project-flow/config.md` using the template below
- Then retry the start-feature flow

### config.md template

```markdown
# Project Flow Config

## Identity
- name: <inferred>
- family: standalone                   # roadmapp | grc | vids | library | standalone
- stack: <stack if known>
- description: <one line, optional>

## Branch convention
- feature: `feature/<slug>`
# - us: `US-<n>-<slug>`                # enable if family=grc
# - fix: `fix/<slug>`

## Folder layout
# features_dir: .project-flow/features
# decisions_dir: docs/adr
# design_dir: design/mockups

## Plugin mapping
- plan: superpowers:writing-plans
- brainstorm: superpowers:brainstorming
- tdd: superpowers:test-driven-development
- review: superpowers:requesting-code-review

## Workflow rules
- cross_review: suggested              # suggested | required | off
- scope_audit: off                     # v1.1
- announce_default: hybrid             # hybrid | always-confirm | always-proceed

## Glossary
# - "user story" → requirements
# - "spike" → research
```

Also scaffold `.project-flow/context.md` with:

```markdown
---
project: <inferred name>
created_at: YYYY-MM-DD
---

# Project context

## Active feature
_(none yet)_

## Cross-feature decisions
_(ADRs land here or in decisions/ — see config.md folder layout)_

## Notes
_(free-form project-level notes)_
```

## Announcement template (verbatim)

```
Creating feature "<slug>":
- branch: feature/<slug>
- dir: .project-flow/features/<slug>/

Proceed? (y/N)
```

## On error

- Feature already exists: show warning, offer `git checkout feature/<slug>` as alternative
- Git checkout failed: show error from CLI, suggest `git status` to debug

## Output

Keep terminal output brief. Link to feature dir for reference.
