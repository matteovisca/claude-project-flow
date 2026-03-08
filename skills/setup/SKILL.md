---
description: Configure project-flow paths for knowledge base, projects, and per-project overrides
---

# Setup claude-project-flow

Configure the working directories for the plugin.

## Current settings

First, read the current settings by calling the MCP tool `project_flow__settings_get`.

## Configuration flow

Show the user the current settings in a clear table, then ask what they want to configure:

1. **Knowledge paths** — Directories containing shared MD files (patterns, conventions, libraries). These are indexed cross-project with FTS5. Multiple paths allowed (e.g., git repo, samba share, local copy).

2. **Default projects path** — Base directory where feature docs are stored for all projects. Each project gets a subdirectory automatically.

3. **Per-project override** — Override the docs path for a specific project. Useful when you want a project's docs stored locally in the repo instead of the shared path.

## Validation and scaffolding

- Expand `~` to the home directory
- Use absolute paths
- If a directory doesn't exist, ask if it should be created
- **When creating a knowledge path**, scaffold the standard structure:
  ```
  <knowledge_path>/
  ├── patterns/        — Reusable design patterns and architectural decisions
  ├── conventions/     — Coding conventions, naming rules, style guides
  └── libraries/       — Library-specific documentation and usage notes
  ```
- **When creating a default projects path**, scaffold:
  ```
  <projects_path>/
  └── (empty — project subdirectories are created by /feature-init)
  ```
- **When creating a per-project override**, scaffold the same `projects/` structure. The user might store multiple projects there.

For each created directory, generate a `README.md` explaining its purpose.

## Saving

After the user confirms, call the MCP tool `project_flow__settings_update` with the updated settings.

## Example interaction

```
Current settings:
  Knowledge paths: (none)
  Default projects path: (none)
  Project overrides: (none)

What would you like to configure?
1. Add a knowledge path
2. Set default projects path
3. Add a project override
4. Done
```
