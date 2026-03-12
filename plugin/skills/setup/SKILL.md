---
description: Configure project-flow plugin memory path
---

# Setup claude-project-flow

Configure the working directory for the plugin.

## Step 1: Read current settings

```bash
node "$PLUGIN_DIR/scripts/dist/setup.cjs" get --json
```

Show the user the current settings:

| Setting | Value |
|---------|-------|
| Memory path | (path or "not set") |

## Step 2: Ask what to configure

Ask the user for the memory path — the base directory where the plugin stores all data. Inside this path, two subdirectories are created:
- `projects/` — Feature documentation organized by project
- `knowledge/` — Shared cross-project knowledge base (patterns, conventions, libraries)

## Step 3: Apply changes via script

Use the script in JSON mode to apply changes. The script handles path validation, directory creation, and scaffolding automatically.

```bash
node "$PLUGIN_DIR/scripts/dist/setup.cjs" set --json \
  memory_path=/path/to/memory
```

**Important:** Always expand `~` to the full home directory path before passing to the script. Use absolute paths only.

If the directory doesn't exist, the script creates it with the full structure:
- `projects/`
- `knowledge/patterns/`
- `knowledge/conventions/`
- `knowledge/libraries/`
- `README.md`

## Step 4: Verify

Run `get --json` again to confirm the changes were applied correctly and show the updated settings.

## Step 5: Next steps

Suggest the user proceed with:
- `/claude-project-flow:project-init` to register the current project

## Interactive mode (for terminal use)

The script also supports a standalone interactive mode when run directly from a terminal (not via Claude):

```bash
node "$PLUGIN_DIR/scripts/dist/setup.cjs"
```

This provides a simple prompt for setting the memory path — useful for manual configuration without spending Claude tokens.
