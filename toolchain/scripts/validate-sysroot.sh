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

check_header "vector"
check_header "algorithm"
check_header "string"
check_header "map"
check_header "iostream"

if [ ! -d "$SYSROOT/lib/wasm32-wasi" ]; then
    echo "[sysroot] missing library directory: lib/wasm32-wasi" >&2
    FAILED=1
fi

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

echo "[sysroot] validation passed"
