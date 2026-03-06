#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/build.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC="$WORKSPACE/src/llvm-project"
BUILD="$WORKSPACE/build/host-llvm"
OUT="$WORKSPACE/out/host-llvm"

if [ ! -d "$SRC" ]; then
    echo "[host-llvm] ERROR: llvm-project source not found at $SRC" >&2
    echo "[host-llvm] Run fetch-sources.sh first" >&2
    exit 1
fi

mkdir -p "$BUILD"

echo "[host-llvm] configuring"
cmake -G Ninja \
    -S "$SRC/llvm" \
    -B "$BUILD" \
    -DCMAKE_BUILD_TYPE=Release \
    -DLLVM_ENABLE_PROJECTS="clang;lld" \
    -DLLVM_TARGETS_TO_BUILD="WebAssembly;X86;AArch64" \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF

echo "[host-llvm] building tablegen tools"
ninja -C "$BUILD" -j"${PARALLEL_JOBS:-$(nproc)}" llvm-tblgen clang-tblgen

if [ ! -f "$BUILD/bin/llvm-tblgen" ] || [ ! -f "$BUILD/bin/clang-tblgen" ]; then
    echo "[host-llvm] ERROR: tablegen tools not found after build" >&2
    exit 1
fi

mkdir -p "$OUT/bin"
cp "$BUILD/bin/llvm-tblgen" "$OUT/bin/"
cp "$BUILD/bin/clang-tblgen" "$OUT/bin/"

echo "[host-llvm] build complete"
