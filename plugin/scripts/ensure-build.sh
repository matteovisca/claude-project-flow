#!/usr/bin/env bash
# Ensure the plugin is built — runs before session-start hook
# If service.cjs exists, skip (marketplace install already has it)
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BUILD_OUTPUT="$PLUGIN_ROOT/scripts/dist/service.cjs"

# if build output exists, skip
if [ -f "$BUILD_OUTPUT" ]; then
	exit 0
fi

# build output missing — try to build from repo root (development clone)
REPO_ROOT="$(cd "$PLUGIN_ROOT/.." && pwd)"

if [ -f "$REPO_ROOT/package.json" ] && grep -q "claude-project-flow" "$REPO_ROOT/package.json" 2>/dev/null; then
	cd "$REPO_ROOT"
	if [ ! -d "node_modules" ]; then
		npm install --silent 2>/dev/null
	fi
	npm run build --silent 2>/dev/null
fi
