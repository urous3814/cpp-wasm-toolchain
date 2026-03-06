# GitHub Status Checks

This document describes the CI status checks produced by this repository's
GitHub Actions workflows. These check names are stable and intended for use
in branch protection rules and rulesets.

---

## Check Names

### `repo-structure`

**Workflow:** `ci.yml`
**Trigger:** pull requests; pushes to `main` and `develop`

Verifies that required files and directories are present in the repository,
that all shell scripts in `toolchain/scripts/` are syntactically valid
(`bash -n`), that scripts have execute permission, and that
`toolchain/config/versions.env` sources cleanly with all expected variables
defined.

This check does not require Node.js or any build step. It is the fastest
gate and runs independently of the other CI jobs.

**Fails when:**
- A required file or directory is missing (e.g., a script deleted without
  replacement, a package source file absent)
- Any `toolchain/scripts/*.sh` has a syntax error
- A script lacks execute permission (`chmod +x` was not committed)
- `versions.env` is malformed or missing a required variable

---

### `typecheck`

**Workflow:** `ci.yml`
**Trigger:** pull requests; pushes to `main` and `develop`
**Depends on:** `repo-structure`

Installs workspace dependencies with `pnpm install --frozen-lockfile` and
runs `pnpm typecheck` (`tsc --noEmit -p tsconfig.json`). Covers all sources
under `packages/*/src/` and `demo/`.

**Fails when:**
- Any TypeScript type error exists in `packages/` or `demo/`
- `pnpm-lock.yaml` is out of sync with `package.json`

---

### `smoke-tests`

**Workflow:** `ci.yml`
**Trigger:** pull requests; pushes to `main` and `develop`
**Depends on:** `repo-structure`

Runs the CI-safe smoke harness (`pnpm smoke-test:ci`), which executes
`tests/smoke/runtime-smoke.mjs`. This harness verifies the WASI runtime shim
source structure without requiring a compiled toolchain.

> **Note:** The full `smoke-test.sh` (which validates sysroot, browser LLVM
> artifacts, and compiled binaries) requires a complete build and runs only
> in `release.yml` via the `package-verify` job.

**Fails when:**
- `packages/runtime/src/wasi-shim.ts` is missing or empty
- Expected exports (`RunOptions`, `RunResult`, `runWasiProgram`) are absent
  from the runtime source

---

### `package-verify`

**Workflow:** `release.yml`
**Trigger:** tag push matching `v*`

Runs the full build pipeline end to end:

1. Install system dependencies (cmake, ninja, python3, ccache)
2. Install Node.js workspace dependencies
3. Fetch LLVM source and wasi-sdk (`fetch-sources.sh`)
4. Activate emsdk at the pinned version
5. Build sysroot (`build-sysroot.sh`) and validate it
6. Build host LLVM for tablegen (`build-host-llvm.sh`)
7. Build browser LLVM — `clang.wasm` + `wasm-ld.wasm` (`build-browser-llvm.sh`)
8. Verify build stage (`verify-build-stage.sh`)
9. Package toolchain (`package-toolchain.sh`)
10. Verify package integrity (`verify-package.sh`)
11. Upload `cpp-wasm-toolchain-<version>.tar.gz` as a workflow artifact and
    as a GitHub Release asset

**Fails when:**
- Any build script exits non-zero
- Sysroot validation fails (missing `libc++.a`, `libc++abi.a`, builtins,
  or STL headers)
- Browser LLVM artifacts are missing or invalid
- Package checksum verification fails
- The expected `.tar.gz` file is absent after packaging

---

### `demo-build`

**Workflow:** `pages.yml`
**Trigger:** pushes to `main`; `workflow_dispatch`

Installs workspace dependencies, compiles `demo/main.ts` to
`demo/dist/main.js`, copies static assets (`index.html`, `style.css`), and
uploads the result as a GitHub Pages artifact. A dependent `deploy` job
publishes the artifact to GitHub Pages if the environment is configured.

**Fails when:**
- `demo/main.ts` has TypeScript errors
- Required static files (`demo/index.html`, `demo/style.css`) are missing

---

## Which Branches Require Which Checks

| Check | `main` | `develop` | Pull Requests |
|-------|--------|-----------|---------------|
| `repo-structure` | required | required | required |
| `typecheck` | required | required | required |
| `smoke-tests` | required | required | required |
| `package-verify` | — | — | — (release tags only) |
| `demo-build` | — | — | — (main push / dispatch) |

> `package-verify` and `demo-build` are not CI jobs and cannot be selected as
> PR required checks. They run only on tag push and main push respectively.
> To protect `main` from bad releases, require `repo-structure`, `typecheck`,
> and `smoke-tests` on the `release/v*` branch before merging.

---

## Configuring Branch Protection

To enforce required checks in GitHub:

1. Go to **Settings → Branches** (or **Rules → Rulesets**)
2. Add or edit the rule for `main` and `develop`
3. Enable **Require status checks to pass before merging**
4. Search for and add:
   - `repo-structure`
   - `typecheck`
   - `smoke-tests`
5. Optionally enable **Require branches to be up to date before merging**

These exact names match the `jobs.<id>` keys in `ci.yml`.
