#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../config/versions.env"
# Environment variable takes precedence over versions.env
VERSION="${TOOLCHAIN_VERSION}"

BROWSER_OUT="$REPO_ROOT/toolchain/workspace/out/browser-toolchain"
SYSROOT_OUT="$REPO_ROOT/toolchain/workspace/out/sysroot"
RUNTIME_DIST="$REPO_ROOT/packages/runtime/dist"
EXAMPLES="$REPO_ROOT/examples"

PKG_NAME="cpp-wasm-toolchain"
PKG_DIR="$REPO_ROOT/dist/$PKG_NAME/$VERSION"
ARCHIVE="$REPO_ROOT/dist/$PKG_NAME-$VERSION.tar.gz"

# ── Validate required source artifacts ───────────────────────────────────────

echo "[package] validating sysroot"
bash "$SCRIPT_DIR/validate-sysroot.sh"

require_file() {
    local path="$1"
    if [ ! -f "$path" ]; then
        echo "[package] ERROR: missing required file: $path" >&2
        exit 1
    fi
}

echo "[package] validating browser toolchain artifacts"
require_file "$BROWSER_OUT/clang.wasm"
require_file "$BROWSER_OUT/wasm-ld.wasm"
require_file "$RUNTIME_DIST/wasi-shim.js"

# ── Assemble release directory ────────────────────────────────────────────────

echo "[package] assembling $PKG_NAME@$VERSION"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/compiler" "$PKG_DIR/linker" "$PKG_DIR/sysroot/lib" "$PKG_DIR/runtime" "$PKG_DIR/examples"

# Required WASM artifacts
cp "$BROWSER_OUT/clang.wasm"   "$PKG_DIR/compiler/"
cp "$BROWSER_OUT/wasm-ld.wasm" "$PKG_DIR/linker/"

# Optional JS/MJS loader wrappers
for name in clang.js clang.mjs; do
    [ -f "$BROWSER_OUT/$name" ] && cp "$BROWSER_OUT/$name" "$PKG_DIR/compiler/" || true
done
for name in wasm-ld.js wasm-ld.mjs; do
    [ -f "$BROWSER_OUT/$name" ] && cp "$BROWSER_OUT/$name" "$PKG_DIR/linker/" || true
done

# Sysroot
cp -r "$SYSROOT_OUT/include"         "$PKG_DIR/sysroot/"
cp -r "$SYSROOT_OUT/lib/wasm32-wasi" "$PKG_DIR/sysroot/lib/"

# Strip Node.js-specific imports from emscripten ES module output.
# When ENVIRONMENT includes 'node', emscripten emits:
#   import { createRequire } from 'module';
# which causes "Failed to resolve module specifier 'module'" in browsers.
echo "[package] patching .mjs files to remove Node.js imports"
for mjs in "$PKG_DIR/compiler/clang.mjs" "$PKG_DIR/linker/wasm-ld.mjs"; do
    [ -f "$mjs" ] || continue
    sed -i '/import.*createRequire.*from.*['"'"'"]module['"'"'"]/d' "$mjs"
    sed -i '/^\s*var require\s*=\s*createRequire/d' "$mjs"
    sed -i '/^\s*const require\s*=\s*createRequire/d' "$mjs"
    echo "[package] patched $(basename "$mjs")"
done

# Create sysroot.tar.gz inside the package so the browser worker can fetch
# and unpack it into the emscripten virtual FS at runtime.
echo "[package] creating sysroot.tar.gz"
tar czf "$PKG_DIR/sysroot/sysroot.tar.gz" \
    -C "$PKG_DIR/sysroot" \
    include lib

# Runtime shim
cp "$RUNTIME_DIST/wasi-shim.js" "$PKG_DIR/runtime/"

# Examples
cp "$EXAMPLES/hello.cpp"       "$PKG_DIR/examples/"
cp "$EXAMPLES/vector_sort.cpp" "$PKG_DIR/examples/"
# Copy any remaining .c/.cpp examples without failing if none match
find "$EXAMPLES" -maxdepth 1 \( -name "*.c" -o -name "*.cpp" \) \
    ! -name "hello.cpp" ! -name "vector_sort.cpp" \
    -exec cp {} "$PKG_DIR/examples/" \; 2>/dev/null || true

# ── Generate manifest and checksums ──────────────────────────────────────────

echo "[package] generating manifest"
TOOLCHAIN_VERSION="$VERSION" node "$SCRIPT_DIR/generate-manifest.mjs"

echo "[package] generating checksums"
TOOLCHAIN_VERSION="$VERSION" node "$SCRIPT_DIR/generate-checksums.mjs"

# ── Create tarball ────────────────────────────────────────────────────────────

echo "[package] creating archive"
tar czf "$ARCHIVE" -C "$(dirname "$PKG_DIR")" "$VERSION"

# ── Summary ───────────────────────────────────────────────────────────────────

PKG_SIZE="$(du -sh "$PKG_DIR" | cut -f1)"
ARCHIVE_SIZE="$(du -sh "$ARCHIVE" | cut -f1)"

echo ""
echo "[package] done"
echo "  package : $PKG_DIR ($PKG_SIZE)"
echo "  tarball : $ARCHIVE ($ARCHIVE_SIZE)"
