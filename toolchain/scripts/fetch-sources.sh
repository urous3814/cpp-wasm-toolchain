#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC_DIR="$WORKSPACE/src"
mkdir -p "$SRC_DIR"

echo "==> Fetching LLVM ${LLVM_VERSION}"
LLVM_TAG="llvmorg-${LLVM_VERSION}"
if [ ! -d "$SRC_DIR/llvm-project" ]; then
    git clone --depth 1 --branch "$LLVM_TAG" \
        https://github.com/llvm/llvm-project.git \
        "$SRC_DIR/llvm-project"
else
    echo "    llvm-project already exists, skipping"
fi

echo "==> Fetching wasi-sdk ${WASI_SDK_VERSION}"
WASI_SDK_URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/wasi-sdk-${WASI_SDK_VERSION}.0-macos.tar.gz"
if [ ! -d "$SRC_DIR/wasi-sdk" ]; then
    mkdir -p "$SRC_DIR/wasi-sdk"
    curl -L "$WASI_SDK_URL" | tar xz --strip-components=1 -C "$SRC_DIR/wasi-sdk"
else
    echo "    wasi-sdk already exists, skipping"
fi

echo "==> Sources fetched"
