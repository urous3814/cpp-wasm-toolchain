#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSROOT="$SCRIPT_DIR/../workspace/out/sysroot"

FAILED=0

check_header() {
    local header="$1"
    if [ ! -f "$SYSROOT/include/$header" ]; then
        echo "[sysroot] missing header: $header" >&2
        FAILED=1
    fi
}

# wasi-sdk 20+: C++ headers are target-scoped under include/wasm32-wasi/c++/v1/
check_header "wasm32-wasi/c++/v1/vector"
check_header "wasm32-wasi/c++/v1/algorithm"
check_header "wasm32-wasi/c++/v1/string"
check_header "wasm32-wasi/c++/v1/map"
check_header "wasm32-wasi/c++/v1/iostream"

if [ ! -d "$SYSROOT/lib/wasm32-wasi" ]; then
    echo "[sysroot] missing library directory: lib/wasm32-wasi" >&2
    FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

echo "[sysroot] validation passed"
