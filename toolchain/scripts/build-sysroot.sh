#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC_DIR="$WORKSPACE/src/wasi-sdk"
OUT_DIR="$WORKSPACE/out/sysroot"

echo "==> Building sysroot from wasi-sdk ${WASI_SDK_VERSION}"

if [ ! -d "$SRC_DIR" ]; then
    echo "ERROR: wasi-sdk source not found at $SRC_DIR"
    echo "Run fetch-sources.sh first"
    exit 1
fi

mkdir -p "$OUT_DIR"

echo "==> Copying sysroot headers"
cp -r "$SRC_DIR/share/wasi-sysroot/include" "$OUT_DIR/"

echo "==> Copying sysroot libs"
mkdir -p "$OUT_DIR/lib"
cp -r "$SRC_DIR/share/wasi-sysroot/lib/wasm32-wasi" "$OUT_DIR/lib/"

echo "==> Sysroot built at $OUT_DIR"
