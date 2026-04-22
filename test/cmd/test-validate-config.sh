#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Absolute path so we can cd around freely
TEST_DIR="$(pwd)"
PF="$TEST_DIR/../plugin/bin/pf"

# Clean up any .git stubs left by previous runs, and on exit
cleanup() {
	rm -rf "$TEST_DIR/fixtures/valid-config/.git" "$TEST_DIR/fixtures/missing-config/.git" 2>/dev/null || true
}
trap cleanup EXIT
cleanup  # also clean before starting, in case a previous run died

# Create .git stubs so resolveProjectContext stops at fixture root (not tracked by git)
mkdir -p "$TEST_DIR/fixtures/valid-config/.git"
mkdir -p "$TEST_DIR/fixtures/missing-config/.git"

# Case 1: config exists and is valid
cd "$TEST_DIR/fixtures/valid-config"
out=$("$PF" validate-config --json)
echo "$out" | grep -q '"ok":true' || { echo "FAIL: expected ok:true"; exit 1; }
cd "$TEST_DIR"

# Case 2: config missing
cd "$TEST_DIR/fixtures/missing-config"
set +e
out=$("$PF" validate-config --json)
code=$?
set -e
[ "$code" -eq 2 ] || { echo "FAIL: expected exit 2 on missing config, got $code"; exit 1; }
echo "$out" | grep -q '"errors"' || { echo "FAIL: expected errors in output"; exit 1; }
cd "$TEST_DIR"

echo "  pass"
