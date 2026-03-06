#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/build.env"

WORKSPACE="$SCRIPT_DIR/../workspace"
SRC="$WORKSPACE/src/llvm-project"
BUILD="$WORKSPACE/build/browser-llvm"
OUT="$WORKSPACE/out/browser-toolchain"
HOST_LLVM="$WORKSPACE/out/host-llvm"
EMSDK_ENV="$WORKSPACE/src/emsdk/emsdk_env.sh"

if [ ! -d "$SRC" ]; then
    echo "[browser-llvm] ERROR: llvm-project source not found at $SRC" >&2
    echo "[browser-llvm] Run fetch-sources.sh first" >&2
    exit 1
fi

if [ ! -f "$HOST_LLVM/bin/llvm-tblgen" ] || [ ! -f "$HOST_LLVM/bin/clang-tblgen" ]; then
    echo "[browser-llvm] ERROR: host tablegen tools not found in $HOST_LLVM/bin" >&2
    echo "[browser-llvm] Run build-host-llvm.sh first" >&2
    exit 1
fi

if [ ! -f "$EMSDK_ENV" ]; then
    echo "[browser-llvm] ERROR: emsdk_env.sh not found at $EMSDK_ENV" >&2
    echo "[browser-llvm] Run bootstrap-macos.sh first" >&2
    exit 1
fi

# shellcheck source=/dev/null
source "$EMSDK_ENV"

mkdir -p "$BUILD" "$OUT"

echo "[browser-llvm] configuring with emcmake"
emcmake cmake -G Ninja \
    -S "$SRC/llvm" \
    -B "$BUILD" \
    -DLLVM_ENABLE_PROJECTS="clang;lld" \
    -DLLVM_TARGETS_TO_BUILD="WebAssembly" \
    -DLLVM_ENABLE_THREADS=OFF \
    -DLLVM_ENABLE_ZLIB=OFF \
    -DLLVM_ENABLE_ZSTD=OFF \
    -DLLVM_ENABLE_TERMINFO=OFF \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DLLVM_TABLEGEN="$HOST_LLVM/bin/llvm-tblgen" \
    -DCLANG_TABLEGEN="$HOST_LLVM/bin/clang-tblgen" \
    -DCMAKE_EXE_LINKER_FLAGS="-sERROR_ON_UNDEFINED_SYMBOLS=0"

echo "[browser-llvm] building clang wasm"
ninja -C "$BUILD" -j"${PARALLEL_JOBS:-$(nproc)}" clang

echo "[browser-llvm] building lld (wasm-ld) wasm"
ninja -C "$BUILD" -j"${PARALLEL_JOBS:-$(nproc)}" lld

cp "$BUILD/bin/clang.wasm" "$OUT/clang.wasm"

# In emscripten cross-compile, lld produces bin/lld.wasm; wasm-ld is a symlink/alias.
# Copy whichever artifact exists as wasm-ld.wasm.
if [ -f "$BUILD/bin/wasm-ld.wasm" ]; then
    cp "$BUILD/bin/wasm-ld.wasm" "$OUT/wasm-ld.wasm"
elif [ -f "$BUILD/bin/lld.wasm" ]; then
    cp "$BUILD/bin/lld.wasm" "$OUT/wasm-ld.wasm"
else
    echo "[browser-llvm] ERROR: neither wasm-ld.wasm nor lld.wasm found in $BUILD/bin" >&2
    ls "$BUILD/bin/"*.wasm 2>/dev/null || true
    exit 1
fi

if [ ! -f "$OUT/clang.wasm" ] || [ ! -f "$OUT/wasm-ld.wasm" ]; then
    echo "[browser-llvm] ERROR: artifacts missing after build" >&2
    exit 1
fi

echo "[browser-llvm] build complete"
