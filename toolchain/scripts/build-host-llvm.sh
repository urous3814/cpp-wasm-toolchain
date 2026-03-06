#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"
source "$SCRIPT_DIR/../config/build.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC_DIR="$WORKSPACE/src/llvm-project"
BUILD_DIR="$WORKSPACE/build/host-llvm"
OUT_DIR="$WORKSPACE/out/host-llvm"

echo "==> Building host LLVM ${LLVM_VERSION} (tablegen tools only)"

if [ ! -d "$SRC_DIR" ]; then
    echo "ERROR: llvm-project source not found at $SRC_DIR"
    echo "Run fetch-sources.sh first"
    exit 1
fi

mkdir -p "$BUILD_DIR"

cmake -G Ninja \
    -S "$SRC_DIR/llvm" \
    -B "$BUILD_DIR" \
    -DCMAKE_BUILD_TYPE=Release \
    -DLLVM_ENABLE_PROJECTS="clang" \
    -DLLVM_TARGETS_TO_BUILD="host" \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DCLANG_ENABLE_STATIC_ANALYZER=OFF \
    -DCLANG_ENABLE_ARCMT=OFF \
    -DCMAKE_INSTALL_PREFIX="$OUT_DIR"

ninja -C "$BUILD_DIR" -j"$PARALLEL_JOBS" llvm-tblgen clang-tblgen

mkdir -p "$OUT_DIR/bin"
cp "$BUILD_DIR/bin/llvm-tblgen" "$OUT_DIR/bin/"
cp "$BUILD_DIR/bin/clang-tblgen" "$OUT_DIR/bin/"

echo "==> Host LLVM built at $OUT_DIR"
"$OUT_DIR/bin/llvm-tblgen" --version
