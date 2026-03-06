# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This is **not** a web IDE. This repository builds and distributes a **browser-side C/C++ WebAssembly toolchain** as a versioned package consumed by separate IDE projects. Deliverables are GitHub Release artifacts and a minimal GitHub Pages demo.

## Commands

```bash
# Bootstrap local dev (macOS) — installs brew deps + emsdk
./toolchain/scripts/bootstrap-macos.sh

# Fetch LLVM source + wasi-sdk (~5 GB, one-time)
./toolchain/scripts/fetch-sources.sh

# Build pipeline (must run in this order)
./toolchain/scripts/build-sysroot.sh
./toolchain/scripts/build-host-llvm.sh

source emsdk/emsdk_env.sh                   # required before browser LLVM build
./toolchain/scripts/build-browser-llvm.sh

# Validate sysroot artifacts before packaging
./toolchain/scripts/validate-sysroot.sh

# Package and test
./toolchain/scripts/package-toolchain.sh
./toolchain/scripts/smoke-test.sh

# npm script aliases
npm run build:sysroot
npm run build:llvm-host
npm run build:llvm-browser
npm run package
npm run test
```

To reduce parallel jobs on low-RAM machines, set `PARALLEL_JOBS=4` in `toolchain/config/build.env` before building.

## Architecture

### Three-Layer Build Pipeline

**Build Layer** (`toolchain/scripts/`)
- `fetch-sources.sh` — clones `llvm-project` (tag-pinned) and downloads `wasi-sdk` binary
- `build-sysroot.sh` — extracts `sysroot/include` and `sysroot/lib/wasm32-wasi` from wasi-sdk
- `build-host-llvm.sh` — minimal host LLVM for tablegen tools (`llvm-tblgen`, `clang-tblgen`); required by the cross-compile step
- `build-browser-llvm.sh` — uses emsdk (`emcmake cmake`) to compile `clang.wasm` + `wasm-ld.wasm` (MinSizeRel, no debug/tests/threads/zlib/libxml2)

**Packaging Layer** (`toolchain/scripts/package-toolchain.sh`)
- Calls `validate-sysroot.sh` first — fails fast if any required artifact is missing
- Assembles `dist/cpp-wasm-toolchain/<version>/` with fixed layout
- Runs `generate-manifest.mjs` (entry points JSON) and `generate-checksums.mjs` (SHA-256 per file)
- Outputs `dist/cpp-wasm-toolchain-<version>.tar.gz`

**Runtime Layer** (`packages/runtime/`)
- `wasi-shim.ts` — browser WASI environment: stdin buffer, stdout/stderr callbacks, timeout (default 10 s), output size limit (default 1 MiB)
- Exports `runWasi(module, opts)` and `WasiExitError`
- WASI syscalls implemented: `fd_read`, `fd_write`, `fd_close`, `fd_seek`, `fd_fdstat_get`, `proc_exit`, `args_*`, `environ_*`, `clock_time_get`, `random_get`, `path_open` (returns ENOSPC)

### Compilation Flow (student code)

```
source.cpp → clang.wasm → object.o → wasm-ld.wasm → program.wasm → WASI runtime → stdout/stderr
```

Target: `wasm32-wasi`, ABI: WASI command mode (`_start` entry).

### Packages

- `packages/runtime/` — WASI browser shim (`runWasi`, `WasiExitError`)
- `packages/loader/` — `Toolchain` class: `loadManifest()`, `loadCompiler()`, `loadLinker()`, `compile()`, `run()`; caches WASM modules in memory after first fetch
- `packages/worker/` — Web Worker wrapper; message types `WorkerRequest` / `WorkerResponse`

### Release Artifact Layout (fixed, versioned)

```
cpp-wasm-toolchain/
  manifest.json        # version, entry points
  checksums.txt
  compiler/clang.mjs + clang.wasm
  linker/wasm-ld.mjs + wasm-ld.wasm
  sysroot/include/ + lib/wasm32-wasi/
  runtime/wasi-shim.js
  examples/hello.cpp, vector_sort.cpp
```

### Centralized Config

All dependency versions in `toolchain/config/versions.env`:
- `LLVM_VERSION=18.1.0`, `WASI_SDK_VERSION=21`, `EMSDK_VERSION=3.1.64`, `TOOLCHAIN_VERSION=0.1.0`

Never hardcode versions in scripts — always `source versions.env`.

## Implementation Rules

- **Fail fast**: every script must start with `set -e` and explicitly check for required artifacts before proceeding
- **Reproducible**: same commit + same config = same artifact; no non-deterministic steps
- **Immutable releases**: never modify a published release; create a new version
- **Validate before packaging**: `validate-sysroot.sh` must confirm `libc++.a`, `libc++abi.a`, builtins, and STL headers exist
- **Incremental milestones**: browser LLVM build (M4) is the hardest step — validate `clang --version` in browser before attempting full compile

## Supported STL (v1 scope)

`iostream`, `vector`, `algorithm`, `string`, `map`, `set`, `queue`, `stack`, `utility`, `cmath`, `cstdlib`, `cstdio`

Not supported in v1: pthread, exceptions, dynamic linking, filesystem, Boost, source maps, LTO.

## Smoke Tests

Required passing tests before any release (`tests/smoke/`):
- `hello.c` — stdio
- `hello.cpp` — iostream
- `vector_sort.cpp` — vector + algorithm
- `string_map.cpp` — string + map
- `compile_error.cpp` — must produce non-empty compiler error, not crash

## CI/CD Workflows (`.github/workflows/`)

- `ci.yml` — runs on PRs and `develop` branch pushes: script syntax validation, smoke checks
- `release.yml` — triggered by `v*` tag push: full build → package → test → GitHub Release upload
- `pages.yml` — deploys `demo/` build to GitHub Pages on `main` push

## Commit and Branching Workflow

### Check current branch first

**Before doing any work**, always verify which branch you are on:

```bash
git branch          # current branch
git status          # uncommitted changes
git log --oneline -5
```

The active branch determines where commits land. Wrong branch = wrong history.
Refer to **[docs/branches.md](docs/branches.md)** for the full branch map, active branches, and status history. **Keep that file updated** whenever a branch is created, merged, or deleted.

### Commit frequency

Commit **early and often** — after every logical unit of work, not at end of day. Each commit must leave the repository in a working state (scripts pass `bash -n`, TypeScript compiles).

Good commit boundaries:
- A single script is written or updated
- A single package file is implemented
- A config value is added or changed
- A test case is added
- Documentation for one topic is complete

Do NOT batch unrelated changes into one commit. Do NOT commit broken or half-finished code.

### Commit format

```
type(scope): description

# types: feat fix chore docs refactor build ci test perf
# scopes: toolchain sysroot compiler linker runtime loader worker demo ci docs package
```

Examples:
```
feat(sysroot): extract wasi-sdk headers and libs
feat(compiler): add build-browser-llvm.sh emcmake cmake invocation
fix(runtime): handle proc_exit code 0 as success
chore(config): pin EMSDK_VERSION to 3.1.64
docs(architecture): add runtime execution flow diagram
ci(release): add artifact upload step to release.yml
test(smoke): add string_map.cpp smoke test
```

Rules:
- Description is lowercase, imperative mood ("add", "fix", "remove" — not "added", "fixes")
- No period at end
- Keep under 72 characters
- Body (optional) explains *why*, not *what*

### Branch strategy

```
main        ← production-ready releases only; updated by release.yml CI
develop     ← integration branch; all feature branches merge here
feature/*   ← new functionality
fix/*       ← bug fixes
release/*   ← release preparation (version bump, changelog)
```

**Always branch from `develop`, never from `main`.**

Branch naming examples:
```
feature/build-sysroot
feature/browser-llvm-build
feature/wasi-shim-implementation
fix/validate-sysroot-libc-check
release/v0.2.0
```

### Branching cadence

Create a new branch for every milestone or significant sub-task. Do not work directly on `develop` for anything larger than a one-liner fix.

Typical flow for a milestone:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/build-sysroot

# ... implement, commit incrementally ...

git push -u origin feature/build-sysroot
# open PR targeting develop
```

### PR rules

- Target: `develop` (never `main` directly)
- Title must follow commit format: `type(scope): description`
- All smoke tests must pass before merge
- CI (`ci.yml`) must be green

### Tagging releases

Only `main` is tagged. After merging `develop` → `main`:
```bash
git tag v0.1.0
git push origin v0.1.0   # triggers release.yml
```

## Current Status

Repository is at **Milestone 1** (foundation complete). Build scripts and packages are scaffolded. The browser LLVM build (Milestone 4) is the highest-risk step and should be approached incrementally. See `docs/roadmap.md` for all milestone definitions of done.
