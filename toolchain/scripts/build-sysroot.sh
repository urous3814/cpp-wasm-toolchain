#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$SCRIPT_DIR/../workspace"

SRC="$WORKSPACE/src"
BUILD="$WORKSPACE/build"
OUT="$WORKSPACE/out"

if [ ! -d "$SRC/wasi-sdk" ]; then
    echo "[sysroot] ERROR: wasi-sdk source not found at $SRC/wasi-sdk" >&2
    echo "[sysroot] Run fetch-sources.sh first" >&2
    exit 1
fi

echo "[sysroot] configuring with CMake"
cmake -G Ninja \
    -B "$BUILD/sysroot" \
    -S "$SRC/wasi-sdk" \
    -DCMAKE_INSTALL_PREFIX="$OUT/sysroot"

echo "[sysroot] building and installing"
ninja -C "$BUILD/sysroot" install

if [ ! -d "$OUT/sysroot/include" ]; then
    echo "[sysroot] ERROR: include directory missing after build" >&2
    exit 1
fi

echo "[sysroot] sysroot built successfully"
