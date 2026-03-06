#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config/versions.env"

echo "==> Installing system dependencies"
brew install cmake ninja git node python rust

echo "==> Installing emsdk ${EMSDK_VERSION}"
if [ ! -d "emsdk" ]; then
    git clone https://github.com/emscripten-core/emsdk.git
fi

cd emsdk
./emsdk install "${EMSDK_VERSION}"
./emsdk activate "${EMSDK_VERSION}"

echo "==> Bootstrap complete"
