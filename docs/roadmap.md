# Roadmap

This document tracks planned milestones for `cpp-wasm-toolchain`.

Each milestone has a clear goal, concrete deliverables, and a definition of done.

---

## Milestone 1 — Repository Foundation

**Status:** Complete

**Goal:** Establish the full repository structure, conventions, and documentation so that any contributor can understand the project and start working.

**Deliverables:**

- Repository skeleton (`toolchain/`, `packages/`, `examples/`, `demo/`, `tests/`, `dist/`)
- `CLAUDE.md` with engineering rules
- `docs/architecture.md`, `docs/roadmap.md`, `docs/build.md`
- `toolchain/config/versions.env` with pinned dependency versions
- Scaffolded build scripts (`*.sh`) with `set -e`, version sourcing, and fail-fast checks
- Workspace packages: `runtime/`, `loader/`, `worker/`
- Smoke test files: `hello.c`, `hello.cpp`, `vector_sort.cpp`, `string_map.cpp`, `compile_error.cpp`
- GitHub Actions: `ci.yml`, `release.yml`, `pages.yml`
- Issue templates and PR template
- `LICENSE`, `.gitignore`, `.editorconfig`, `.gitattributes`

**Definition of done:** A new developer can clone the repo, read the docs, and understand every script's purpose before running any build.

---

## Milestone 2 — Sysroot Build

**Status:** Scaffolded — not yet executed

**Goal:** Extract and validate a working WASI sysroot containing all C/C++ headers and static libraries needed for `wasm32-wasi` compilation.

**Deliverables:**

- `toolchain/workspace/out/sysroot/include/` — C and C++ headers from wasi-sdk
- `toolchain/workspace/out/sysroot/lib/wasm32-wasi/` — static libraries:
  - `libc.a`
  - `libc++.a`
  - `libc++abi.a`
  - `libclang_rt.builtins-wasm32.a`
- `validate-sysroot.sh` passes without errors

**Key script:** `toolchain/scripts/build-sysroot.sh`

**Definition of done:** `validate-sysroot.sh` exits 0. All required STL headers (`iostream`, `vector`, `algorithm`, `string`, `map`, `set`, `queue`, `stack`) are present.

---

## Milestone 3 — Host LLVM Bootstrap

**Status:** Scaffolded — not yet executed

**Goal:** Build a minimal native LLVM to obtain `llvm-tblgen` and `clang-tblgen`. These tools are required by the cross-compilation step (Milestone 4) because tablegen must run on the host machine, not inside WebAssembly.

**Deliverables:**

- `toolchain/workspace/out/host-llvm/bin/llvm-tblgen`
- `toolchain/workspace/out/host-llvm/bin/clang-tblgen`

**Key script:** `toolchain/scripts/build-host-llvm.sh`

**Build flags:** `Release` build type, host target only, no tests, no examples, no benchmarks, only `clang` project enabled.

**Definition of done:** Both binaries exist and `llvm-tblgen --version` prints the expected LLVM version.

---

## Milestone 4 — Browser Clang Build

**Status:** Not started — highest risk milestone

**Goal:** Use emscripten to compile Clang and LLD to WebAssembly, producing `clang.wasm` and `wasm-ld.wasm` that run in the browser.

**Deliverables:**

- `toolchain/workspace/out/browser-toolchain/clang.wasm`
- `toolchain/workspace/out/browser-toolchain/clang.mjs`
- `toolchain/workspace/out/browser-toolchain/wasm-ld.wasm`
- `toolchain/workspace/out/browser-toolchain/wasm-ld.mjs`

**Key script:** `toolchain/scripts/build-browser-llvm.sh`

**Build flags:**
- `MinSizeRel` build type (binary size matters)
- `emcmake cmake` (emscripten toolchain)
- `LLVM_ENABLE_THREADS=OFF`
- `LLVM_ENABLE_ZLIB=OFF`, `LLVM_ENABLE_LIBXML2=OFF`
- Only `WebAssembly` target enabled
- Cross-compile with host tablegen tools from Milestone 3

**Risk factors:**
- Build time: 60–120 minutes
- Disk space: ~5 GB for sources, ~2 GB for build artifacts
- emscripten version compatibility with LLVM 18 must be verified
- Output binary size: clang.wasm is typically 20–40 MB

**Incremental validation:** Before running a full compile pipeline, verify:

```bash
# Load the browser WASM and call clang --version equivalent
node -e "const m = require('./out/browser-toolchain/clang.mjs'); m.callMain(['--version'])"
```

**Definition of done:** `clang.wasm` loads in a browser worker and reports its version without crashing.

---

## Milestone 5 — Runtime Execution

**Status:** Scaffolded — not yet tested end-to-end

**Goal:** Implement and validate the WASI browser runtime that executes student-compiled `program.wasm` in the browser.

**Deliverables:**

- `packages/runtime/src/wasi-shim.ts` — complete WASI implementation:
  - `fd_write` → stdout/stderr callbacks
  - `fd_read` → stdin buffer
  - `proc_exit` → `WasiExitError`
  - `clock_time_get`, `random_get`, `environ_sizes_get`, etc.
  - Execution timeout enforcement
  - Output byte limit enforcement
- End-to-end test: compile `hello.cpp` → run → capture `"Hello, World!\n"` in browser

**Key package:** `packages/runtime/`

**Definition of done:** A browser page can compile and run `hello.cpp` end-to-end, capturing stdout correctly. Timeout and output limit enforcement is verified.

---

## Milestone 6 — Packaging

**Status:** Scaffolded — not yet executed

**Goal:** Assemble a versioned, reproducible release artifact containing all toolchain components.

**Deliverables:**

- `dist/cpp-wasm-toolchain-0.1.0.tar.gz`
- `manifest.json` with correct entry points and version
- `checksums.txt` with SHA-256 for every included file
- Artifact layout exactly matches the spec in `architecture.md`

**Key scripts:** `package-toolchain.sh`, `generate-manifest.mjs`, `generate-checksums.mjs`

**Definition of done:** The tarball extracts to the documented layout. `manifest.json` is valid JSON. `checksums.txt` verifies cleanly with `sha256sum -c`.

---

## Milestone 7 — Release Automation

**Status:** Scaffolded — GitHub Actions in place, not yet triggered

**Goal:** Automate the full build → package → test → publish cycle via GitHub Actions when a version tag is pushed.

**Deliverables:**

- `.github/workflows/release.yml` builds and uploads the artifact on `v*` tags
- `.github/workflows/ci.yml` runs lint and smoke checks on all PRs
- Published GitHub Release with `cpp-wasm-toolchain-x.y.z.tar.gz` attached
- Release is immutable — no post-publish modifications

**Definition of done:** Pushing `git tag v0.1.0 && git push --tags` triggers a complete CI build and publishes the artifact to GitHub Releases automatically.

---

## Milestone 8 — Demo Site

**Status:** Scaffolded — UI shell exists, not yet wired to real toolchain

**Goal:** Deploy a minimal GitHub Pages demo that lets anyone compile and run a C++ snippet in the browser.

**Deliverables:**

- `demo/index.html` — textarea editor + run button + output panel
- `demo/main.ts` — loads toolchain from CDN, compiles, runs, streams output
- `demo/style.css` — clean, minimal dark theme
- Deployed to GitHub Pages via `pages.yml`
- Demo page compiles and runs `vector_sort.cpp` end-to-end

**Definition of done:** The GitHub Pages URL loads, compiles the default example, and shows output within 30 seconds on a cold start (including WASM loading time).

---

## Milestone 9 — Documentation Polish

**Status:** In progress

**Goal:** Ensure the documentation is complete enough for a new developer to contribute without asking questions.

**Deliverables:**

- `docs/architecture.md` — full diagrams, compilation pipeline, packaging pipeline, runtime flow, security model
- `docs/roadmap.md` — all milestones with definitions of done
- `docs/build.md` — step-by-step macOS setup guide with troubleshooting
- `README.md` — quick start, architecture summary, links to docs
- `docs/BUILD_DEBUG.md` — common build failures and fixes

**Definition of done:** A developer unfamiliar with the project can follow `docs/build.md` from zero and reach a working `clang.wasm` build without external help.

---

## Future Work (post v1)

These are not committed to any milestone but are tracked for future consideration:

| Feature | Notes |
|---|---|
| Compile caching | Cache compiled `.o` files by source hash in IndexedDB |
| Incremental compilation | Only recompile changed translation units |
| Toolchain size reduction | LTO + wasm-opt on `clang.wasm` |
| Custom runtime ABI | Support non-WASI output formats |
| Better diagnostics | Structured JSON compiler error output |
| Source maps | Map WASM instructions back to source lines |
| Exception support | Enable C++ exception handling |
| Multi-file projects | Link multiple `.cpp` files |
| Shared worker | One compiler instance shared across browser tabs |
