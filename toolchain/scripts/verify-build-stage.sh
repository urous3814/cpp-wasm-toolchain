#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "[verify] validating sysroot"
bash "$SCRIPT_DIR/validate-sysroot.sh"

echo "[verify] validating browser toolchain"
bash "$SCRIPT_DIR/validate-browser-toolchain.sh"

echo "[verify] running artifact smoke test"
bash "$SCRIPT_DIR/smoke-test-browser-toolchain.sh"

echo "[verify] running node smoke harness"
node "$REPO_ROOT/tests/smoke/browser-toolchain-smoke.mjs"

echo "[verify] all build validations passed"
