#!/usr/bin/env bash
set -euo pipefail

# claude-project-flow — Install Script
# Build, register as marketplace plugin, permanent loading on every session

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_NAME="claude-project-flow"

echo "=== $PLUGIN_NAME — Install ==="
echo "Source: $SCRIPT_DIR"
echo ""

# --- 1. Check prerequisites ---
echo "--- Prerequisites ---"

NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
	echo "  ERROR Node.js >= 18 required (found: $(node -v 2>/dev/null || echo 'not installed'))"
	exit 1
fi
echo "  [ok] Node.js $(node -v)"

if ! command -v claude &> /dev/null; then
	echo "  ERROR comando 'claude' non trovato nel PATH"
	exit 1
fi
echo "  [ok] Claude Code CLI"

if ! command -v jq &> /dev/null; then
	echo "  WARN jq non trovato — installalo per la gestione automatica dei permessi"
fi
echo ""

# --- 2. Install dependencies & build ---
echo "--- Build ---"
cd "$SCRIPT_DIR"
npm install 2>&1 | tail -1
echo "  [ok] Dependencies"

npm run build 2>&1 | tail -1
echo "  [ok] Build"

if [ ! -f "$SCRIPT_DIR/plugin/scripts/dist/service.cjs" ]; then
	echo "  ERROR Build failed — plugin/scripts/dist/service.cjs not found"
	exit 1
fi

# quick smoke test
node "$SCRIPT_DIR/plugin/scripts/dist/service.cjs" hook session-start > /dev/null 2>&1 || true
echo "  [ok] Smoke test"
echo ""

# --- 3. Register plugin via marketplace ---
echo "--- Plugin Registration ---"

CLAUDE_DIR="$HOME/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

# check if already registered
if [ -f "$SETTINGS_FILE" ] && command -v jq &> /dev/null; then
	if jq -e ".enabledPlugins[\"$PLUGIN_NAME@$PLUGIN_NAME\"]" "$SETTINGS_FILE" &> /dev/null 2>&1; then
		echo "  SKIP  plugin già registrato e abilitato"
	else
		echo "  INFO  Plugin non ancora registrato."
		echo ""
		echo "  Esegui questi comandi dentro Claude Code:"
		echo ""
		echo "    /plugin marketplace add $SCRIPT_DIR"
		echo "    /plugin install $PLUGIN_NAME@$PLUGIN_NAME"
		echo ""
		echo "  Oppure in modalità sviluppo (solo questa sessione):"
		echo "    claude --plugin-dir $SCRIPT_DIR"
	fi
else
	echo "  INFO  Registra il plugin dentro Claude Code:"
	echo ""
	echo "    /plugin marketplace add $SCRIPT_DIR"
	echo "    /plugin install $PLUGIN_NAME@$PLUGIN_NAME"
fi
echo ""

# --- 4. MCP Server check ---
echo "--- MCP Server ---"
claude_json="$HOME/.claude.json"
if [ -f "$claude_json" ] && command -v jq &> /dev/null; then
	if jq -e '.mcpServers["project-flow"]' "$claude_json" &> /dev/null 2>&1; then
		echo "  SKIP  project-flow MCP già configurato"
	else
		echo "  INFO  MCP server non registrato globalmente (ok se usi il plugin system)"
	fi
fi
echo ""

# --- 5. Permissions ---
echo "--- Permissions ---"
SETTINGS_LOCAL="$CLAUDE_DIR/settings.local.json"

if command -v jq &> /dev/null; then
	# MCP tool permissions for the plugin
	PERMS='[
		"mcp__project-flow__feature_get",
		"mcp__project-flow__feature_list",
		"mcp__project-flow__feature_update",
		"mcp__project-flow__knowledge_index",
		"mcp__project-flow__knowledge_search",
		"mcp__project-flow__project_list",
		"mcp__project-flow__project_register",
		"mcp__project-flow__settings_get",
		"mcp__project-flow__settings_update"
	]'

	if [ -f "$SETTINGS_LOCAL" ]; then
		tmp_file="$(mktemp)"
		echo "$PERMS" | jq '.' > /dev/null 2>&1 # validate JSON
		jq --argjson new_perms "$PERMS" '
			.permissions.allow = (
				(.permissions.allow // []) + $new_perms | unique
			)
		' "$SETTINGS_LOCAL" > "$tmp_file"
		mv "$tmp_file" "$SETTINGS_LOCAL"
		echo "  UPDATE settings.local.json (permessi MCP aggiunti)"
	else
		jq -n --argjson perms "$PERMS" '{
			permissions: {
				allow: $perms,
				deny: [],
				ask: []
			}
		}' > "$SETTINGS_LOCAL"
		echo "  CREATE settings.local.json"
	fi
else
	echo "  SKIP  jq non disponibile — approva manualmente i permessi MCP al primo utilizzo"
fi
echo ""

# --- Report ---
echo "==========================================="
echo "  Build completato!"
echo "==========================================="
echo ""
echo "Prossimi passi:"
echo ""
echo "  1. Dentro Claude Code, registra il plugin:"
echo "     /plugin marketplace add $SCRIPT_DIR"
echo "     /plugin install $PLUGIN_NAME@$PLUGIN_NAME"
echo ""
echo "  2. Configura i path:"
echo "     /claude-project-flow:setup"
echo ""
echo "  3. Inizializza il progetto:"
echo "     /claude-project-flow:project-init"
echo ""
