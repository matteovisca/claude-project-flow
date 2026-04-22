#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
TEST_DIR="$(pwd)"

PF="$TEST_DIR/../plugin/bin/pf"

# Create .git stubs so resolveProjectContext stops at fixture root (not tracked by git)
mkdir -p "$TEST_DIR/fixtures/valid-config/.git"
mkdir -p "$TEST_DIR/fixtures/missing-config/.git"

# Case 1: config exists and is valid
cd fixtures/valid-config
out=$("$PF" validate-config --json)
echo "$out" | grep -q '"ok":true' || { echo "FAIL: expected ok:true"; exit 1; }
cd ../..

# Case 2: config missing
cd fixtures/missing-config
set +e
out=$("$PF" validate-config --json)
code=$?
set -e
[ "$code" -eq 2 ] || { echo "FAIL: expected exit 2 on missing config, got $code"; exit 1; }
echo "$out" | grep -q '"error"' || { echo "FAIL: expected error in output"; exit 1; }
cd ../..

echo "  pass"
