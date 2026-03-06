#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$SCRIPT_DIR/../workspace/src"

source "$SCRIPT_DIR/../config/versions.env"

mkdir -p "$SRC_DIR"

# ── llvm-project ──────────────────────────────────────────────────────────────
# Clone at the exact tag for LLVM_VERSION to ensure reproducibility.

if [ -d "$SRC_DIR/llvm-project" ]; then
    echo "[fetch] llvm-project already exists"
else
    echo "[fetch] cloning llvm-project @ llvmorg-${LLVM_VERSION}"
    git clone --depth=1 \
        --branch "llvmorg-${LLVM_VERSION}" \
        https://github.com/llvm/llvm-project.git \
        "$SRC_DIR/llvm-project"
fi

# ── wasi-sdk (pre-built binary) ───────────────────────────────────────────────
# Download the official pre-built wasi-sdk release binary and extract it.
# Building wasi-sdk from source requires Clang as the host compiler and
# git tags in the repo — neither is reliably available in CI.

if [ -d "$SRC_DIR/wasi-sdk" ]; then
    echo "[fetch] wasi-sdk already extracted"
else
    # Detect platform
    case "$(uname -s)-$(uname -m)" in
        Linux-x86_64)   WASI_PLATFORM="x86_64-linux"  ;;
        Darwin-arm64)   WASI_PLATFORM="arm64-macos"   ;;
        Darwin-x86_64)  WASI_PLATFORM="x86_64-macos"  ;;
        *)
            echo "[fetch] ERROR: unsupported platform $(uname -s)-$(uname -m)" >&2
            exit 1
            ;;
    esac

    WASI_TARBALL="wasi-sdk-${WASI_SDK_VERSION}.0-${WASI_PLATFORM}.tar.gz"
    WASI_URL="https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-${WASI_SDK_VERSION}/${WASI_TARBALL}"
    WASI_ARCHIVE="$SRC_DIR/${WASI_TARBALL}"

    if [ ! -f "$WASI_ARCHIVE" ]; then
        echo "[fetch] downloading wasi-sdk ${WASI_SDK_VERSION} (${WASI_PLATFORM})"
        curl -L --fail --show-error -o "$WASI_ARCHIVE" "$WASI_URL"
    else
        echo "[fetch] wasi-sdk tarball already downloaded"
    fi

    echo "[fetch] extracting wasi-sdk"
    mkdir -p "$SRC_DIR/wasi-sdk"
    tar xzf "$WASI_ARCHIVE" --strip-components=1 -C "$SRC_DIR/wasi-sdk"
fi

# ── emsdk ─────────────────────────────────────────────────────────────────────

if [ -d "$SRC_DIR/emsdk" ]; then
    echo "[fetch] emsdk already exists"
else
    echo "[fetch] cloning emsdk"
    git clone --depth=1 https://github.com/emscripten-core/emsdk.git "$SRC_DIR/emsdk"
fi

echo "[fetch] sources ready"
