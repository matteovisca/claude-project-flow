#!/usr/bin/env bash
# Ensure the plugin is built — runs before session-start hook
# If service.cjs exists and is newer than all source files, skip build
set -euo pipefail

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BUILD_OUTPUT="$PLUGIN_ROOT/scripts/dist/service.cjs"

# if build output exists, skip (marketplace install already has it)
if [ -f "$BUILD_OUTPUT" ]; then
	exit 0
fi

# build output missing — fresh clone, need to build
cd "$PLUGIN_ROOT"

if [ ! -d "node_modules" ]; then
	npm install --silent 2>/dev/null
fi

npm run build --silent 2>/dev/null
