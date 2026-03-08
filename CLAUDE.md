# claude-project-flow

Plugin Claude Code per gestione workflow di progetto.

## Stack
- TypeScript + esbuild → CJS bundle
- SQLite (better-sqlite3) per DB locale
- MCP SDK per tool registration
- FTS5 per ricerca full-text

## Struttura
- `src/` — sorgente TypeScript
- `plugin/` — output distribuito (skills, hooks, scripts compilati)
- `scripts/` — build pipeline

## Convenzioni
- Indentazione: TAB
- Commit: Conventional Commits in italiano
- Codice e commenti: inglese
