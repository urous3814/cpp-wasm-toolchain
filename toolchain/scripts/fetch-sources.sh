#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../workspace/src"

mkdir -p "$SRC_DIR"

clone_if_missing() {
    local name="$1"
    local url="$2"
    local dest="$SRC_DIR/$name"

    if [ -d "$dest" ]; then
        echo "[fetch] $name already exists"
    else
        echo "[fetch] cloning $name"
        git clone --depth=1 "$url" "$dest"
    fi
}

clone_if_missing "llvm-project" "https://github.com/llvm/llvm-project.git"
clone_if_missing "wasi-sdk"     "https://github.com/WebAssembly/wasi-sdk.git"
clone_if_missing "emsdk"        "https://github.com/emscripten-core/emsdk.git"

echo "[fetch] sources ready"
