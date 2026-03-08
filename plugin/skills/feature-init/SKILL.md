---
name: feature-init
description: Initialize a new feature with branch, directory structure, and tracking
---

# Feature Init

Initialize a new feature for the current project.

## Parameters
- `$ARGUMENTS` — Feature name (required, e.g. "integrate-storage")

## Steps

1. **Detect project**: Get the current project name from the git root directory
2. **Create branch**: `git checkout -b feature/$ARGUMENTS` from the current branch
3. **Create directory structure** in `.claude/features/$ARGUMENTS/`:
   ```
   requirements.md   — Empty template with sections: Objective, Scope, Constraints, Acceptance Criteria
   plan.md           — Empty template with sections: Approach, Phases, Dependencies
   progress.md       — Initialized with: Objective (empty), Status: draft, Sessions: []
   ```
4. **Register in DB**: Call `project_register` MCP tool if project not yet registered, then create feature record via `feature_update`
5. **Search knowledge**: Call `knowledge_search` with the feature name to find relevant patterns or previous similar work
6. **Report**: Show the user what was created and any relevant knowledge found

## Templates

### requirements.md
```markdown
# Feature: $ARGUMENTS

## Objective
<!-- What this feature should achieve -->

## Scope
<!-- What's included and what's NOT included -->

## Constraints
<!-- Technical or business constraints -->

## Acceptance Criteria
- [ ] ...
```

### plan.md
```markdown
# Plan: $ARGUMENTS

## Approach
<!-- High-level approach -->

## Phases
### Phase 1: ...
- [ ] ...

## Dependencies
<!-- External dependencies or blockers -->
```

### progress.md
```markdown
# Progress: $ARGUMENTS

## Objective
<!-- Copied from requirements once defined -->

## Status: draft

## Sessions
<!-- Updated automatically or via /feature-progress -->
```
