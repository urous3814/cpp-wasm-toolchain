#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"

TESTS_DIR="$(pwd)/tests/smoke"
WORKSPACE="$SCRIPT_DIR/../workspace"
BROWSER_OUT="$WORKSPACE/out/browser-llvm"
SYSROOT_OUT="$WORKSPACE/out/sysroot"
CLANG="$BROWSER_OUT/clang"
PASS=0
FAIL=0

echo "==> Running smoke tests"

run_test() {
    local name="$1"
    local src="$2"
    local expect_fail="${3:-false}"

    echo -n "    $name ... "
    local out
    if out=$("$CLANG" \
        --target=wasm32-wasi \
        --sysroot="$SYSROOT_OUT" \
        -o /dev/null "$src" 2>&1); then
        if [ "$expect_fail" = "true" ]; then
            echo "FAIL (expected compiler error but succeeded)"
            FAIL=$((FAIL + 1))
        else
            echo "OK"
            PASS=$((PASS + 1))
        fi
    else
        if [ "$expect_fail" = "true" ] && [ -n "$out" ]; then
            echo "OK (expected error)"
            PASS=$((PASS + 1))
        else
            echo "FAIL"
            echo "      $out"
            FAIL=$((FAIL + 1))
        fi
    fi
}

run_test "hello.c"           "$TESTS_DIR/hello.c"
run_test "hello.cpp"         "$TESTS_DIR/hello.cpp"
run_test "vector_sort.cpp"   "$TESTS_DIR/vector_sort.cpp"
run_test "string_map.cpp"    "$TESTS_DIR/string_map.cpp"
run_test "compile_error.cpp" "$TESTS_DIR/compile_error.cpp" true

echo ""
echo "==> Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
