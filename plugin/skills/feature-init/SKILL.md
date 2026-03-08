---
name: feature-init
description: Initialize a new feature — branch, directory structure, definition, and DB tracking
---

# Feature Init

Initialize a new feature for the current project.

## Parameters
- `$ARGUMENTS` — Feature name (optional, will be asked interactively if not provided)

## Step 1: Detect project and git state

- Get project name from git root directory basename
- Check if git is initialized; if not, offer to run `git init`
- Get current branch name
- Check if the project is registered in DB via `project_flow__project_list`
  - If not registered, suggest running `/claude-project-flow:project-init` first

## Step 2: Branch selection

Ask the user:

> Vuoi lavorare sul branch corrente (`<current_branch>`) o creare un nuovo branch?
> 1. Usa il branch corrente
> 2. Crea un nuovo branch

### Option 1: Current branch
- Use the current branch as-is
- If the branch matches `feature/<name>` and `$ARGUMENTS` was not provided, extract the feature name from the branch

### Option 2: New branch
- If `$ARGUMENTS` is provided, propose `feature/$ARGUMENTS` as branch name
- If not, ask the user for a feature name first
- Show the proposed branch name and ask for confirmation/override
- **Check for pending changes** (`git status`):
  - If there are uncommitted changes (staged or unstaged), ask the user:
    > Ci sono modifiche non committate. Cosa vuoi fare?
    > 1. Porta le modifiche sul nuovo branch (switch diretto)
    > 2. Committa prima sul branch corrente, poi crea il nuovo branch
  - Option 1: proceed with `git checkout -b feature/<name>` (changes carry over)
  - Option 2: guide the user through a commit on the current branch, then create the new branch
- If no pending changes, create the branch directly: `git checkout -b feature/<name>`

## Step 3: Feature naming and description

- If the feature name wasn't determined yet, ask for it
- Ask the user for a brief description (2-3 sentences) of what the feature should accomplish
- Draft a `feature-definition.md` (see template below) and present it for review
- Incorporate user feedback before saving

## Step 4: Resolve docs path

1. Call `project_flow__settings_get` to read settings
2. Check if `project_overrides[project_name]` exists → use that
3. Otherwise use `default_projects_path/project_name/`
4. If neither is set, ask the user and suggest running `/claude-project-flow:setup` first
5. The feature directory will be: `<resolved_path>/features/<feature_name>/`

## Step 5: Handle versioning (Archive)

Check if the feature directory already exists:

### If directory exists (resuming work on same branch):
1. Count existing `Archive/v*` folders to determine next version number
2. Move all current root-level content (except `Archive/`) into `Archive/vN/`
3. Log: `Sessione precedente archiviata in Archive/vN/`
4. Proceed to create fresh working copy at root

### If directory does not exist:
- Create it fresh, no archiving needed

## Step 6: Create directory structure

Create the feature directory:
```
<resolved_path>/features/<feature_name>/
├── feature-definition.md    — Generated in step 3
├── context/                 — Background info, research, references
├── plans/                   — Implementation plans and phases
├── requirements/            — Requirements and acceptance criteria
└── Archive/                 — (created only when versioning occurs)
    ├── v1/                  — First concluded iteration
    ├── v2/                  — Second concluded iteration
    └── ...
```

## Step 7: Register in DB

1. Call `project_flow__feature_update` with:
   - `project`: project name
   - `name`: feature name
   - `status`: `draft`
   - `branch`: the branch name (e.g. `feature/<name>`)
2. If the project is not registered yet, call `project_flow__project_register` first

## Step 8: Knowledge search

Call `project_flow__knowledge_search` with the feature name and description keywords to find relevant patterns, conventions, or previous similar work.

## Step 9: Report

Show the user a summary:
- Feature name and branch
- Docs path created
- DB registration status
- Any relevant knowledge found
- If versioning occurred, mention what was archived
- Suggest next steps:
  - `/claude-project-flow:feature-requirements` to define requirements
  - Start working on the feature directly

## Templates

### feature-definition.md
```markdown
# Feature: <name>

## Description
<!-- 2-3 sentences describing what this feature does and why -->

## Branch
`feature/<name>`

## Created
<date>

## Status
draft
```
