#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
BROWSER_OUT="$WORKSPACE/out/browser-llvm"
SYSROOT_OUT="$WORKSPACE/out/sysroot"
DIST_DIR="$(pwd)/dist"
PKG_NAME="cpp-wasm-toolchain"
PKG_DIR="$DIST_DIR/$PKG_NAME/$TOOLCHAIN_VERSION"

echo "==> Validating artifacts before packaging"
"$SCRIPT_DIR/validate-sysroot.sh"

for artifact in clang.wasm clang.mjs wasm-ld.wasm wasm-ld.mjs; do
    [ -f "$BROWSER_OUT/$artifact" ] || {
        echo "ERROR: Missing browser LLVM artifact: $artifact"
        exit 1
    }
done

echo "==> Assembling package $PKG_NAME@$TOOLCHAIN_VERSION"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/compiler" "$PKG_DIR/linker" "$PKG_DIR/sysroot" "$PKG_DIR/runtime" "$PKG_DIR/examples"

cp "$BROWSER_OUT/clang.mjs"      "$PKG_DIR/compiler/"
cp "$BROWSER_OUT/clang.wasm"     "$PKG_DIR/compiler/"
cp "$BROWSER_OUT/wasm-ld.mjs"    "$PKG_DIR/linker/"
cp "$BROWSER_OUT/wasm-ld.wasm"   "$PKG_DIR/linker/"
cp -r "$SYSROOT_OUT/include"     "$PKG_DIR/sysroot/"
cp -r "$SYSROOT_OUT/lib"         "$PKG_DIR/sysroot/"
cp "packages/runtime/src/wasi-shim.ts" "$PKG_DIR/runtime/wasi-shim.js"
cp examples/*.c examples/*.cpp   "$PKG_DIR/examples/" 2>/dev/null || true

echo "==> Generating manifest"
TOOLCHAIN_VERSION="$TOOLCHAIN_VERSION" node "$SCRIPT_DIR/generate-manifest.mjs" "$PKG_DIR"

echo "==> Generating checksums"
node "$SCRIPT_DIR/generate-checksums.mjs" "$PKG_DIR"

echo "==> Creating archive"
ARCHIVE="$DIST_DIR/$PKG_NAME-$TOOLCHAIN_VERSION.tar.gz"
tar czf "$ARCHIVE" -C "$DIST_DIR/$PKG_NAME" "$TOOLCHAIN_VERSION"

echo "==> Package ready: $ARCHIVE"
ls -lh "$ARCHIVE"
