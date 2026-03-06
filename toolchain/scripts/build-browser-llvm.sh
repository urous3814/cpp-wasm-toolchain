#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"
source "$SCRIPT_DIR/../config/build.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC_DIR="$WORKSPACE/src/llvm-project"
BUILD_DIR="$WORKSPACE/build/browser-llvm"
OUT_DIR="$WORKSPACE/out/browser-llvm"
HOST_LLVM="$WORKSPACE/out/host-llvm"
EMSDK_DIR="$(pwd)/emsdk"

echo "==> Building browser LLVM ${LLVM_VERSION} (clang.wasm + wasm-ld.wasm)"

if [ ! -d "$SRC_DIR" ]; then
    echo "ERROR: llvm-project source not found at $SRC_DIR"
    exit 1
fi

if [ ! -f "$HOST_LLVM/bin/llvm-tblgen" ]; then
    echo "ERROR: host llvm-tblgen not found at $HOST_LLVM/bin/llvm-tblgen"
    echo "Run build-host-llvm.sh first"
    exit 1
fi

if [ ! -f "$EMSDK_DIR/emsdk_env.sh" ]; then
    echo "ERROR: emsdk not found at $EMSDK_DIR"
    echo "Run bootstrap-macos.sh first"
    exit 1
fi

source "$EMSDK_DIR/emsdk_env.sh"

mkdir -p "$BUILD_DIR" "$OUT_DIR"

emcmake cmake -G Ninja \
    -S "$SRC_DIR/llvm" \
    -B "$BUILD_DIR" \
    -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DLLVM_ENABLE_PROJECTS="clang;lld" \
    -DLLVM_TARGETS_TO_BUILD="WebAssembly" \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_ENABLE_THREADS=OFF \
    -DLLVM_ENABLE_ZLIB=OFF \
    -DLLVM_ENABLE_LIBXML2=OFF \
    -DCLANG_ENABLE_STATIC_ANALYZER=OFF \
    -DCLANG_ENABLE_ARCMT=OFF \
    -DLLVM_TABLEGEN="$HOST_LLVM/bin/llvm-tblgen" \
    -DCLANG_TABLEGEN="$HOST_LLVM/bin/clang-tblgen" \
    -DCMAKE_INSTALL_PREFIX="$OUT_DIR"

ninja -C "$BUILD_DIR" -j"$PARALLEL_JOBS" clang wasm-ld

cp "$BUILD_DIR/bin/clang.js"   "$OUT_DIR/clang.mjs"
cp "$BUILD_DIR/bin/clang.wasm" "$OUT_DIR/clang.wasm"
cp "$BUILD_DIR/bin/wasm-ld.js"   "$OUT_DIR/wasm-ld.mjs"
cp "$BUILD_DIR/bin/wasm-ld.wasm" "$OUT_DIR/wasm-ld.wasm"

echo "==> Browser LLVM built at $OUT_DIR"
echo "    clang.wasm:   $(du -sh "$OUT_DIR/clang.wasm" | cut -f1)"
echo "    wasm-ld.wasm: $(du -sh "$OUT_DIR/wasm-ld.wasm" | cut -f1)"
