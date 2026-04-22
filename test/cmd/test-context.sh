#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

TEST_DIR="$(pwd)"
PF="$TEST_DIR/../plugin/bin/pf"

# Cleanup: remove .git stubs AND fake feature dirs left over
cleanup() {
	rm -rf "$TEST_DIR/fixtures/valid-config/.git" 2>/dev/null || true
	rm -rf "$TEST_DIR/fixtures/valid-config/.project-flow/features" 2>/dev/null || true
}
trap cleanup EXIT
cleanup  # also clean before starting

cd "$TEST_DIR/fixtures/valid-config"

# Initialize fixture as git repo with feature branch
git init -q -b main .
git config user.email "test@test"
git config user.name "test"
git commit --allow-empty -q -m "init"
git checkout -q -b feature/demo

# Scaffold a fake feature dir so context recognizes it
mkdir -p .project-flow/features/demo
echo "# demo" > .project-flow/features/demo/context.md

out=$("$PF" context --json)

echo "$out" | grep -q '"feature":"demo"' || { echo "FAIL: expected feature:demo in $out"; exit 1; }
echo "$out" | grep -q '"project":"fixture-project"' || { echo "FAIL: expected project:fixture-project"; exit 1; }

echo "  pass"
