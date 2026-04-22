#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

TEST_DIR="$(pwd)"
PF="$TEST_DIR/../plugin/bin/pf"

cleanup() {
	rm -rf "$TEST_DIR/fixtures/valid-config/.git" 2>/dev/null || true
	rm -rf "$TEST_DIR/fixtures/valid-config/.project-flow/features" 2>/dev/null || true
}
trap cleanup EXIT
cleanup  # before start too

cd "$TEST_DIR/fixtures/valid-config"

# Initialize fixture as real git repo
git init -q -b main .
git config user.email "test@test"
git config user.name "test"
git commit --allow-empty -q -m "init"

# Case 1: start-feature creates branch + dir structure
out=$("$PF" start-feature auth --branch feature/auth --json)

echo "$out" | grep -q '"slug":"auth"' || { echo "FAIL: expected slug:auth in $out"; exit 1; }
[ -d .project-flow/features/auth ] || { echo "FAIL: feature dir missing"; exit 1; }
[ -f .project-flow/features/auth/context.md ] || { echo "FAIL: context.md missing"; exit 1; }
[ -d .project-flow/features/auth/requirements ] || { echo "FAIL: requirements/ missing"; exit 1; }
[ -d .project-flow/features/auth/plans ] || { echo "FAIL: plans/ missing"; exit 1; }

br=$(git branch --show-current)
[ "$br" = "feature/auth" ] || { echo "FAIL: expected branch feature/auth, got $br"; exit 1; }

# Case 2: re-running on existing feature should warn (exit 1), not duplicate
git checkout -q main
set +e
out2=$("$PF" start-feature auth --branch feature/auth --json)
code=$?
set -e
[ "$code" -eq 1 ] || { echo "FAIL: expected exit 1 on existing feature, got $code"; exit 1; }

echo "  pass"
