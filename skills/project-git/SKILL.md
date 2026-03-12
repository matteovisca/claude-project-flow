---
name: project-git
description: Run git log, diff, or status on a registered project
---

# Project Git

Run git operations on a registered project's source directory.

## Parameters
- `<project-name>` — Name of the registered project
- `<command>` — Git operation: `log`, `diff`, or `status`

## Usage
- `/project-git claude-project-flow log`
- `/project-git my-app diff`
- `/project-git api-service status`

## Execution

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/dist/project-git.cjs" <project> <command> --json
```

Parse JSON output and present formatted results with branch name and path.

Handle errors: project not found, path doesn't exist, not a git repo.
