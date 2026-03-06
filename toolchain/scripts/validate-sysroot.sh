#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSROOT="$SCRIPT_DIR/../workspace/out/sysroot"

echo "==> Validating sysroot at $SYSROOT"

fail() {
    echo "ERROR: $1"
    exit 1
}

[ -d "$SYSROOT" ] || fail "sysroot directory not found: $SYSROOT"

# Required libraries
for lib in libc++.a libc++abi.a libclang_rt.builtins-wasm32.a; do
    found=$(find "$SYSROOT/lib" -name "$lib" 2>/dev/null | head -1)
    [ -n "$found" ] || fail "Missing library: $lib"
    echo "    OK $lib"
done

# Required STL headers
for header in iostream vector algorithm string map set queue stack; do
    [ -f "$SYSROOT/include/c++/v1/$header" ] || \
    [ -f "$SYSROOT/include/$header" ] || \
    fail "Missing STL header: $header"
    echo "    OK <$header>"
done

echo "==> Sysroot validation passed"
