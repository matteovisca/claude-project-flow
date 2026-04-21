#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

TESTS_DIR=./cmd
if [ ! -d "$TESTS_DIR" ]; then
	echo "no tests yet"
	exit 0
fi

failed=0
passed=0
for t in "$TESTS_DIR"/test-*.sh; do
	[ -f "$t" ] || continue
	echo "▸ $(basename "$t")"
	if bash "$t"; then
		passed=$((passed + 1))
	else
		failed=$((failed + 1))
	fi
done

echo ""
echo "passed: $passed, failed: $failed"
[ "$failed" -eq 0 ]
