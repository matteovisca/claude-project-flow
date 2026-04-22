# Third-party notices

## Delegated plugins

claude-project-flow does not bundle any third-party code. It invokes other plugins at runtime if installed:

### obra/superpowers

- License: MIT
- Source: https://github.com/obra/superpowers
- Usage: optional delegation target for `/project-flow:plan` and other scopes via `.project-flow/config.md` mapping
- No code from superpowers is included in this repository

### codex (v2+)

- Source: https://github.com/openai/codex (or current fork)
- Usage: planned cross-review delegation in future versions

## Development inspiration

Design patterns and checklist structure were influenced by reading (but not copying code from):

- [obra/superpowers](https://github.com/obra/superpowers) — skill structure, TDD discipline
- [GitHub Spec-kit](https://github.com/github/spec-kit) — spec-first folder conventions
- [kiro.dev](https://kiro.dev/) — steering-docs triad
