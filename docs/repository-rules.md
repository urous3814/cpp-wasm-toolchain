# Repository Rules

Engineering rules for contributors. These rules are not optional — they exist
to keep the toolchain reproducible, auditable, and safe to release.

---

## Rule 1 — Deterministic Builds

Every build must produce bit-identical artifacts given the same commit and the
same config file (`toolchain/config/versions.env`).

**Implications:**

- Pin all dependency versions in `versions.env`. Never use floating references
  like `latest` in build scripts (bootstrap is the only exception, and it reads
  the pinned version from env).
- Do not add non-deterministic steps (timestamps in artifact names, random
  seeds, locale-dependent output).
- If an artifact changes without a code change, the build is broken. Treat it
  as a bug.

---

## Rule 2 — Fail Fast

Every script must exit immediately on the first error. No silently-ignored
failures.

**Required script header:**

```bash
#!/usr/bin/env bash
set -euo pipefail
```

**Implications:**

- Check for required inputs and artifacts at the top of each script, before
  doing any work.
- Never suppress errors with `|| true` unless the failure is genuinely
  acceptable and the reason is documented in a comment.
- A script that partially succeeds is worse than one that fails clearly.

---

## Rule 3 — Immutable Releases

Once a version is published to GitHub Releases, its artifacts must not be
modified. If a fix is required, create a new version.

**Release tag format:** `vMAJOR.MINOR.PATCH`

**Implications:**

- Never re-upload a `.tar.gz` for an existing tag.
- Never modify `manifest.json` or `checksums.txt` in a released archive.
- Checksums are the source of truth for artifact identity.

---

## Rule 4 — Centralized Version Management

All dependency versions live in one file:

```
toolchain/config/versions.env
```

**Variables:**

```bash
LLVM_VERSION=18.1.0
WASI_SDK_VERSION=30
EMSDK_VERSION=3.1.64
TOOLCHAIN_VERSION=0.1.0
```

**Implications:**

- Every build script sources this file before use.
- Never hardcode a version number anywhere else in the repository.
- To upgrade a dependency, change it in `versions.env` and verify all affected
  scripts still pass.

---

## Rule 5 — Minimal Hidden Dependencies

Every script must declare its inputs, outputs, and assumptions explicitly.

**Implications:**

- If a script requires a previous step to have run (e.g., `build-host-llvm.sh`
  requires `fetch-sources.sh`), it must check for the required artifacts at the
  top and print a clear error if they are missing.
- Never depend on environment state that is not documented (e.g., a PATH
  entry that happens to exist on the developer's machine).
- The only allowed implicit inputs are: the repo checkout, `versions.env`, and
  emsdk env sourced explicitly by the script that needs it.

---

## Rule 6 — Stable Release Layout

The packaged artifact layout is versioned and must not change between patch
releases without a minor version bump.

**Canonical layout:**

```
cpp-wasm-toolchain/<version>/
  manifest.json
  checksums.txt
  compiler/clang.wasm        (+ clang.mjs if present)
  linker/wasm-ld.wasm        (+ wasm-ld.mjs if present)
  runtime/wasi-shim.js
  sysroot/include/
  sysroot/lib/wasm32-wasi/
  examples/
```

**Implications:**

- Consumer code (loader, worker, demo) must reference paths via `manifest.json`
  — never hardcode relative paths to `.wasm` files.
- Adding new optional files is safe. Removing or renaming required files is a
  breaking change.

---

## Rule 7 — Reproducible Packaging

Packaging must be a pure function of build artifacts.

**Implications:**

- `package-toolchain.sh` must call `validate-sysroot.sh` before copying
  anything.
- `generate-manifest.mjs` must validate all expected files exist before writing
  `manifest.json`.
- `generate-checksums.mjs` must walk files deterministically (sorted by path).
- The final `.tar.gz` must be created with deterministic `tar` flags.

---

## Rule 8 — Keep the Demo Lightweight

The `demo/` directory is a minimal browser proof-of-concept only.

**Rules:**

- No editor frameworks (Monaco, CodeMirror, etc.) in the demo.
- No build-time bundlers are required to view the demo; tsc compilation is
  sufficient.
- The demo must not pull in IDE-specific state management (Zustand, Redux,
  etc.).
- The demo may use the `packages/loader` and `packages/worker` APIs but must
  not reach into internal build scripts.
- Keep `demo/` deployable as a static site.

---

## Rule 9 — No IDE Code in This Repository

This repository builds and distributes a **browser-side C/C++ WebAssembly
toolchain package**. It is not an IDE.

**Prohibited:**

- Monaco Editor or other rich editors
- Cell-based notebook interfaces
- Language server protocol integrations
- Pyodide, CheerpJ, or any other language runtime other than wasm32-wasi
- Any UI framework with opinionated routing or state management

**If you need an IDE feature, implement it in the consuming IDE project** (e.g.,
`coala/PoC/C/` or `coala/PoC/editor/`) using the package distributed from
this repository.

---

## Rule 10 — Clear Logging in Scripts

Every script must produce readable, prefixed progress output so that CI logs
are understandable without reading the script source.

**Format:**

```
[<scope>] <message>
```

Examples:

```
[bootstrap] Installing dependencies
[sysroot] configuring with CMake
[host-llvm] building tablegen tools
[package] assembling cpp-wasm-toolchain@0.1.0
[smoke] all smoke tests passed
```

**Implications:**

- Use `[scope]` prefix consistently for each script.
- Error messages must go to stderr: `echo "[scope] ERROR: ..." >&2`
- Print a success message at the end of every script so the caller knows it
  completed.
- Do not use `echo` for debug tracing in CI scripts unless protected by a
  `VERBOSE` flag.

---

## Commit Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:** `feat` `fix` `chore` `docs` `refactor` `build` `ci` `test` `perf`

**Scopes:** `toolchain` `sysroot` `compiler` `linker` `runtime` `loader`
`worker` `demo` `ci` `docs` `package`

**Rules:**

- Lowercase, imperative mood, no period at end.
- Maximum 72 characters.
- Each commit must leave the repository in a working state.
- Do not batch unrelated changes into one commit.

---

## Branch and Merge Principles

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Release-grade only — tagged releases, no direct work | Protected; CI-only writes |
| `develop` | Integration — all feature and fix branches merge here | Protected; PR required |
| `feature/*` | New functionality — short-lived, branch from `develop` | None |
| `fix/*` | Bug fixes — short-lived, branch from `develop` | None |
| `release/*` | Release hardening only — version bump, changelog, final smoke | None |

**Rules:**

- Always branch from `develop`. Never branch from `main`.
- Direct pushes to `main` and `develop` are not part of the intended workflow. Use pull requests.
- Pull requests are the default and expected path to merge changes into protected branches.
- `release/*` branches exist solely for release preparation (version bump in `versions.env`,
  changelog, final smoke run). No feature work belongs there.
- Delete merged branches from both local and remote after the PR lands.
- Update `docs/branches.md` when creating or closing a branch.

---

## Required Validation Before Merge

All of the following must pass before a PR can be merged to `develop`:

**Repository structure**
- [ ] `bash -n toolchain/scripts/*.sh` — all shell scripts are syntactically valid
- [ ] `toolchain/config/versions.env` sources cleanly with no undefined variables

**TypeScript**
- [ ] `pnpm typecheck` exits 0 — no type errors in `packages/`

**Smoke tests**
- [ ] `node tests/smoke/runtime-smoke.mjs` passes all cases
- [ ] `tests/smoke/hello.c` compiles and prints expected output
- [ ] `tests/smoke/hello.cpp` compiles and prints expected output
- [ ] `tests/smoke/compile_error.cpp` produces non-empty compiler error (does not crash)

**Package verification (release-facing branches only)**
- [ ] `./toolchain/scripts/validate-sysroot.sh` exits 0
- [ ] `./toolchain/scripts/package-toolchain.sh` produces a valid `.tar.gz`
- [ ] `checksums.txt` matches all files in the archive

**Documentation**
- [ ] If a public script interface, build contract, or package API changed — the relevant
  doc in `docs/` is updated to match
- [ ] `docs/branches.md` reflects the current branch state

**CI**
- [ ] `ci.yml` workflow is green on the branch before merge

---

## Release Safety

- **Artifacts are immutable.** Once a version is published to GitHub Releases, its `.tar.gz`,
  `manifest.json`, and `checksums.txt` must not be modified. If a fix is needed, create a new
  version.
- **Never re-upload to an existing tag.** Overwriting a release artifact breaks checksum
  verification for anyone who has already downloaded it.
- **Version bumps must be intentional.** Increment `TOOLCHAIN_VERSION` in `versions.env` only
  as a deliberate decision, not as a side effect of unrelated work.
- **Verify before publishing.** `validate-sysroot.sh` and `package-toolchain.sh` must both exit
  cleanly, and smoke tests must pass, before tagging a release.
- **Tagging triggers the release pipeline.** Pushing a `v*` tag to `main` triggers `release.yml`.
  Do not push version tags to test — use a staging branch or dry-run flag instead.
- **`main` receives only release-verified commits.** Merge `develop` → `main` only after the
  release branch has been smoke-tested and reviewed.

---

## Pull Request Requirements

Before a PR can be merged to `develop`:

- [ ] `pnpm typecheck` passes
- [ ] Bash script syntax is valid (`bash -n` for all `.sh` files)
- [ ] `tests/smoke/runtime-smoke.mjs` passes
- [ ] CI workflow (`ci.yml`) is green
- [ ] All commits follow the commit convention above
- [ ] Documentation is updated if a public API or build contract changed
