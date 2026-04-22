#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

TEST_DIR="$(pwd)"
PF="$TEST_DIR/../plugin/bin/pf"

# cleanup fake dirs created during the test
cleanup() {
	rm -rf "$TEST_DIR/fixtures/valid-config/.project-flow/features" 2>/dev/null || true
	rm -rf "$TEST_DIR/fixtures/valid-config/.git" 2>/dev/null || true
}
trap cleanup EXIT
cleanup  # clean before starting

cd "$TEST_DIR/fixtures/valid-config"

# next-number uses resolveProjectContext which walks up looking for .git.
# Create a stub .git here so it pins to this fixture as project root.
mkdir -p .git

mkdir -p .project-flow/features/demo/requirements
mkdir -p .project-flow/features/demo/plans

# Case 1: empty dir → 001
out=$("$PF" next-number demo/requirements)
[ "$out" = "001" ] || { echo "FAIL: expected 001 on empty dir, got '$out'"; exit 1; }

# Case 2: after creating 001 and 002 → next is 003
touch .project-flow/features/demo/requirements/001-a.md
touch .project-flow/features/demo/requirements/002-b.md
out=$("$PF" next-number demo/requirements)
[ "$out" = "003" ] || { echo "FAIL: expected 003 after two files, got '$out'"; exit 1; }

# Case 3: different type still starts from 001
out=$("$PF" next-number demo/plans)
[ "$out" = "001" ] || { echo "FAIL: expected 001 for empty plans/, got '$out'"; exit 1; }

echo "  pass"
