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
2. `.project-flow/config.md` exists (if missing → delegate to `/project-flow:init`, see below)
3. Working tree is clean (or warn user)

## Procedure

1. **Read context**: run `${CLAUDE_PLUGIN_ROOT}/bin/pf context --json` to confirm project is recognized.
2. **If config is missing** (`error: config.md not found`): **delegate to init** — see section below. Do NOT inline the bootstrap here.
3. **Validate slug**: reject if contains spaces, uppercase letters, or special characters other than `-` and `_`.
4. **Ask for optional one-line description** (skip if user provides it upfront).
5. **Announce intent** (this is an irreversible action — ask for confirmation):
   > "I'll create branch `feature/<slug>` and scaffold `.project-flow/features/<slug>/`. Confirm?"
6. **Invoke CLI**: `${CLAUDE_PLUGIN_ROOT}/bin/pf start-feature <slug> --branch feature/<slug> --json`
7. **Parse output**: on success, extract `slug`, `branch`, `featureDir`.
8. **Suggest next step**: tell user to invoke `/project-flow:requirements` to collect initial requirements.

## Delegate to init when config is missing

If `pf context` returns `error: config.md not found`, the project hasn't been bootstrapped yet. Do NOT scaffold inline. Instead:

1. **Announce** (verbatim):
   > "Config assente. Invoco `/project-flow:init` ora, poi riprendo con la feature `<slug>`. Procedo?"
2. On confirmation, **invoke the `init` skill** to scaffold `.project-flow/config.md` + `.project-flow/context.md`.
3. After init completes successfully, **resume this skill from step 3** (slug validation) without re-prompting the user for the slug.
4. If user declines the delegate, exit with hint: *"Run `/project-flow:init` manually when ready."*

This keeps `init` as the single owner of bootstrap logic (announce, never magic; delegate, don't reinvent).

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
