#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EMSDK_DIR="$REPO_ROOT/toolchain/workspace/src/emsdk"

echo "[bootstrap] Installing dependencies"
brew install cmake ninja git node python rust ccache

echo "[bootstrap] Installing emsdk"
if [ ! -d "$EMSDK_DIR" ]; then
    git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
fi

echo "[bootstrap] Activating emsdk"
cd "$EMSDK_DIR"
./emsdk install latest
./emsdk activate latest
# shellcheck source=/dev/null
source ./emsdk_env.sh

if ! command -v emcc &>/dev/null; then
    echo "[bootstrap] ERROR: emcc not found after emsdk activation" >&2
    exit 1
fi

emcc --version

echo "[bootstrap] Environment ready"
