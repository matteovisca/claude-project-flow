---
name: man
description: Show available claude-project-flow commands and usage. Pass a command name for detailed help.
---

# man

Display inline reference for claude-project-flow commands.

## Usage

- `/project-flow:man` — list all skills with one-line summary
- `/project-flow:man <skill>` — detailed help for a specific skill

## Behavior

When invoked without arguments, output this table:

| Command | Purpose |
|---------|---------|
| `/project-flow:start-feature <slug>` | Create branch + scaffold .project-flow/features/<slug>/ |
| `/project-flow:requirements` | Dialog to collect/update feature requirements |
| `/project-flow:plan` | Delegate to superpowers:writing-plans, save in plans/ |
| `/project-flow:close-feature` | Generate docs, mark feature closed, optional merge |
| `/project-flow:man [skill]` | This help |

When invoked with a skill argument, read the skill's own SKILL.md file from the plugin directory and print its full content.

## Implementation notes

Use the Read tool to fetch `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/SKILL.md` when a specific skill is requested. Never invent content — always pull from source.

Output in terminal, no file writes.
