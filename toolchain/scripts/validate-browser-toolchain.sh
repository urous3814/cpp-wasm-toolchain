#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/../workspace/out/browser-toolchain"

print_artifact() {
    local file="$1"
    local size
    size=$(wc -c < "$file")
    echo "[browser-toolchain] found $(basename "$file") ($size bytes)"
}

FAILED=0

for required in clang.wasm wasm-ld.wasm; do
    path="$OUT/$required"
    if [ ! -f "$path" ]; then
        echo "[browser-toolchain] ERROR: missing required file: $required" >&2
        FAILED=1
    elif [ ! -s "$path" ]; then
        echo "[browser-toolchain] ERROR: file is empty: $required" >&2
        FAILED=1
    else
        print_artifact "$path"
    fi
done

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

for optional in clang.js clang.mjs wasm-ld.js wasm-ld.mjs; do
    path="$OUT/$optional"
    if [ -f "$path" ]; then
        print_artifact "$path"
    fi
done

echo "[browser-toolchain] validation passed"
