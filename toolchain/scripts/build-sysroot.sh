#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$SCRIPT_DIR/../workspace"

SRC="$WORKSPACE/src"
OUT="$WORKSPACE/out"

# The wasi-sdk binary places the sysroot under share/wasi-sysroot/.
WASI_SYSROOT_SRC="$SRC/wasi-sdk/share/wasi-sysroot"

if [ ! -d "$SRC/wasi-sdk" ]; then
    echo "[sysroot] ERROR: wasi-sdk not found at $SRC/wasi-sdk" >&2
    echo "[sysroot] Run fetch-sources.sh first" >&2
    exit 1
fi

if [ ! -d "$WASI_SYSROOT_SRC" ]; then
    echo "[sysroot] ERROR: sysroot not found at $WASI_SYSROOT_SRC" >&2
    echo "[sysroot] Expected pre-built wasi-sdk binary layout." >&2
    echo "[sysroot] Ensure fetch-sources.sh downloaded the binary (not cloned source)." >&2
    exit 1
fi

echo "[sysroot] extracting headers from wasi-sdk binary"
mkdir -p "$OUT/sysroot/include"
cp -r "$WASI_SYSROOT_SRC/include/." "$OUT/sysroot/include/"

echo "[sysroot] extracting libs from wasi-sdk binary"
mkdir -p "$OUT/sysroot/lib"
cp -r "$WASI_SYSROOT_SRC/lib/." "$OUT/sysroot/lib/"

# Verify expected layout is present
if [ ! -d "$OUT/sysroot/include" ]; then
    echo "[sysroot] ERROR: include directory missing after extraction" >&2
    exit 1
fi

if [ ! -d "$OUT/sysroot/lib/wasm32-wasi" ]; then
    echo "[sysroot] ERROR: lib/wasm32-wasi missing after extraction" >&2
    exit 1
fi

echo "[sysroot] sysroot extracted successfully"
