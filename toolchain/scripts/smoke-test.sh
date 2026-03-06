#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

source "$SCRIPT_DIR/../config/versions.env"

step() {
    echo ""
    echo "[smoke] ── $1"
}

# ── Validation steps ──────────────────────────────────────────────────────────

step "validate-sysroot"
bash "$SCRIPT_DIR/validate-sysroot.sh"

step "validate-browser-toolchain"
bash "$SCRIPT_DIR/validate-browser-toolchain.sh"

step "smoke-test-browser-toolchain"
bash "$SCRIPT_DIR/smoke-test-browser-toolchain.sh"

step "node: browser-toolchain-smoke.mjs"
node "$REPO_ROOT/tests/smoke/browser-toolchain-smoke.mjs"

step "node: runtime-smoke.mjs"
node "$REPO_ROOT/tests/smoke/runtime-smoke.mjs"

# ── Package verification (optional — only if package has been assembled) ──────

ARCHIVE="$REPO_ROOT/dist/cpp-wasm-toolchain-${TOOLCHAIN_VERSION}.tar.gz"
if [ -f "$ARCHIVE" ] || [ -d "$REPO_ROOT/dist/cpp-wasm-toolchain/${TOOLCHAIN_VERSION}" ]; then
    step "verify-package"
    bash "$SCRIPT_DIR/verify-package.sh"
else
    echo ""
    echo "[smoke] skipping verify-package (package not yet assembled)"
fi

# ── Result ────────────────────────────────────────────────────────────────────

echo ""
echo "[smoke] all smoke tests passed"
