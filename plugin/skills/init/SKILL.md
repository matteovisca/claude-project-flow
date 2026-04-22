---
name: init
description: Bootstrap claude-project-flow in the current repo — scaffold .project-flow/config.md and .project-flow/context.md. Use on first adoption or to reconfigure an existing setup.
---

# init

Initialize claude-project-flow for the current project. Creates `.project-flow/config.md` (identity + conventions + plugin mapping) and `.project-flow/context.md` (living index). Safe to run on a fresh repo or on an existing one that hasn't adopted PF yet.

## Usage

- `/project-flow:init` — fresh bootstrap (fails if `.project-flow/config.md` already exists)
- `/project-flow:init --reconfig` — interactive edit of existing config (v2, out of scope for MVP)

## Preconditions

1. Current directory is a git repo
2. `.project-flow/config.md` does not exist (unless `--reconfig`)

## Procedure

1. **Detect repo identity**:
   - project name: `basename` of git remote `origin` URL (strip `.git`), fallback to current dir name
   - stack: inspect for `package.json`, `*.csproj`, `pyproject.toml`, `go.mod` — report what you find
   - default branch: `git symbolic-ref refs/remotes/origin/HEAD` (fallback `main`)

2. **Dialog (short, skip any the user already specified upfront)**:
   - `name` (default: inferred)
   - `family`: one of `roadmapp | grc | vids | library | standalone` (default: `standalone`)
   - `stack`: one-line free text (default: inferred)
   - `description`: optional one-liner
   - `branch pattern`: default `feature/<slug>` — ask only if family = `grc` (may prefer `US-<n>-<slug>`)
   - `plugin mapping`: propose defaults (`superpowers:writing-plans`, `superpowers:brainstorming`, `superpowers:test-driven-development`, `superpowers:requesting-code-review`) — ask only if user wants to override

3. **Announce intent** (irreversible on disk, ask confirmation):
   > "Creating `.project-flow/config.md` and `.project-flow/context.md` at the repo root. Proceed?"

4. **Write `.project-flow/config.md`** using the template below.

5. **Write `.project-flow/context.md`** using the template below.

6. **Verify**: run `${CLAUDE_PLUGIN_ROOT}/bin/pf validate-config --json` and report any warnings.

7. **Suggest next step**: `"/project-flow:start-feature <slug>` to start your first feature."

## config.md template

```markdown
# Project Flow Config

## Identity
- name: <value>
- family: <value>                      # roadmapp | grc | vids | library | standalone
- stack: <value>
- description: <value or empty>

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

## context.md template

```markdown
---
project: <name>
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

## On error

- `.project-flow/config.md` already exists and no `--reconfig`: stop, suggest `/project-flow:init --reconfig` (v2) or manual edit.
- Not a git repo: stop, ask user to `git init` first — PF relies on branch conventions.

## Output

Keep terminal output brief. Report the two created paths + next-step hint.
