# claude-project-flow

Per-project workflow orchestrator plugin for Claude Code. Filesystem-only, versioned with git, no DB, no MCP, no dashboard.

## What it does

Manages feature lifecycle for a single project: create feature branch + scaffold folder, collect requirements, create plans (delegating to installed plugins like `superpowers`), generate final docs, close feature.

All state lives in `.project-flow/` inside your project repo, as markdown files you can read and edit by hand.

## Installation

```bash
claude plugin install matteovisca/claude-project-flow
```

## Quick start

```bash
cd your-project
# First time setup:
/project-flow:start-feature export-csv
# → creates branch feature/export-csv + .project-flow/features/export-csv/

/project-flow:requirements
# → dialog → saves requirements/001-initial.md

/project-flow:plan
# → delegates to superpowers:writing-plans → plans/001-export-csv.md

# ... implement ...

/project-flow:close-feature
# → generates docs/overview.md + implementation.md + edge-cases.md
# → optionally merges branch
```

## Commands

| Command | Purpose |
|---------|---------|
| `/project-flow:start-feature <slug>` | New feature: branch + folder scaffold |
| `/project-flow:requirements` | Collect/update requirements via dialog |
| `/project-flow:plan` | Create implementation plan (delegates to superpowers if installed) |
| `/project-flow:close-feature` | Generate docs + optional merge + mark closed |
| `/project-flow:man [skill]` | Inline reference |

## Folder structure

```
your-project/
└── .project-flow/
    ├── config.md                   ← per-project adaptation
    ├── context.md                  ← cross-feature living state
    └── features/
        └── <slug>/
            ├── context.md
            ├── requirements/       ← NNN-*.md
            ├── plans/              ← NNN-*.md
            ├── research/           ← on-demand
            ├── design/             ← on-demand
            └── docs/               ← generated at close
```

## Configuration

If `.project-flow/config.md` doesn't exist when you invoke `/project-flow:start-feature`, the skill will guide you through creating one. Edit to customize:

- Branch conventions (e.g. `feature/<slug>` vs `US-<n>-<slug>`)
- Folder layout overrides (if you already have `docs/adr/` etc.)
- Plugin mapping (`plan: superpowers:writing-plans` by default — change per project)
- Workflow rules (announce default, cross-review policy)

## External dependencies

The plugin itself has **zero runtime dependencies** (only Node.js ≥18). Optional external plugins can be invoked for specific scopes — configured via `config.md`:

- `superpowers:writing-plans` — recommended for `/project-flow:plan`
- `superpowers:test-driven-development` — optional, manifesto-style
- `codex:rescue` — v2, cross-review

If a mapped plugin isn't installed, the session-start hook warns (non-blocking).

## Philosophy

- **Per-project**: scope limited to one project, not a cross-project knowledge manager
- **Filesystem-only**: markdown + git. Anything more (DB, MCP, dashboard) was overkill in previous versions
- **Delegate, don't reinvent**: leverage ecosystem plugins for specialized phases
- **Announce, never magic**: every routing to an external plugin is announced before invocation

## Status

v0.2.0 — MVP. See [docs/superpowers/specs/](docs/superpowers/specs/) for design and [docs/superpowers/plans/](docs/superpowers/plans/) for implementation plan.

## License

MIT
