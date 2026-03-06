#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../config/versions.env"
VERSION="${TOOLCHAIN_VERSION}"

PKG_DIR="$REPO_ROOT/dist/cpp-wasm-toolchain/$VERSION"
ARCHIVE="$REPO_ROOT/dist/cpp-wasm-toolchain-$VERSION.tar.gz"

FAILED=0

require_file() {
    local rel="$1"
    local abs="$PKG_DIR/$rel"
    if [ ! -f "$abs" ]; then
        echo "[package] ERROR: missing file: $abs" >&2
        FAILED=1
    else
        echo "[package] ok: $rel"
    fi
}

require_dir() {
    local rel="$1"
    local abs="$PKG_DIR/$rel"
    if [ ! -d "$abs" ]; then
        echo "[package] ERROR: missing directory: $abs" >&2
        FAILED=1
    else
        echo "[package] ok: $rel/"
    fi
}

# ── Package directory ─────────────────────────────────────────────────────────

if [ ! -d "$PKG_DIR" ]; then
    echo "[package] ERROR: versioned dist directory not found: $PKG_DIR" >&2
    exit 1
fi

# ── Required files ────────────────────────────────────────────────────────────

require_file "manifest.json"
require_file "checksums.txt"
require_file "compiler/clang.wasm"
require_file "linker/wasm-ld.wasm"
require_file "runtime/wasi-shim.js"
require_file "examples/hello.cpp"
require_file "examples/vector_sort.cpp"

# ── Required directories ──────────────────────────────────────────────────────

require_dir "sysroot/include"
require_dir "sysroot/lib/wasm32-wasi"

# ── Tarball ───────────────────────────────────────────────────────────────────

if [ ! -f "$ARCHIVE" ]; then
    echo "[package] ERROR: tarball not found: $ARCHIVE" >&2
    FAILED=1
else
    echo "[package] ok: tarball $(basename "$ARCHIVE")"
fi

# ── Result ────────────────────────────────────────────────────────────────────

if [ "$FAILED" -ne 0 ]; then
    exit 1
fi

echo "[package] verification passed"
