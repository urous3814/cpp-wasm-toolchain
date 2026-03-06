#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

OUT="$SCRIPT_DIR/../workspace/out/browser-toolchain"
SYSROOT="$SCRIPT_DIR/../workspace/out/sysroot"
EXAMPLES="$REPO_ROOT/examples"

FAILED=0

require_file() {
    local path="$1"
    if [ ! -f "$path" ]; then
        echo "[smoke-browser] ERROR: missing file: $path" >&2
        FAILED=1
    elif [ ! -s "$path" ]; then
        echo "[smoke-browser] ERROR: file is empty: $path" >&2
        FAILED=1
    fi
}

require_dir() {
    local path="$1"
    if [ ! -d "$path" ]; then
        echo "[smoke-browser] ERROR: missing directory: $path" >&2
        FAILED=1
    fi
}

echo "[smoke-browser] checking compiler artifacts"
require_file "$OUT/clang.wasm"
require_file "$OUT/wasm-ld.wasm"

echo "[smoke-browser] checking sysroot"
require_dir "$SYSROOT/include"
require_dir "$SYSROOT/lib/wasm32-wasi"

echo "[smoke-browser] checking examples"
require_file "$EXAMPLES/hello.c"
require_file "$EXAMPLES/hello.cpp"
require_file "$EXAMPLES/vector_sort.cpp"

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

echo "[smoke-browser] artifact smoke test passed"
