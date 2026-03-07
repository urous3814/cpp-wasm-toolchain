# Architecture

This document describes the internal architecture of `cpp-wasm-toolchain`.

---

## High-Level Overview

The project is organized into three independent layers that flow from build-time to browser runtime:

```
┌─────────────────────────────────────────────────────────┐
│                     BUILD LAYER                         │
│                                                         │
│  fetch-sources.sh                                       │
│       │                                                 │
│       ├── wasi-sdk  ──► build-sysroot.sh                │
│       │                      │                          │
│       └── llvm-project ──► build-host-llvm.sh           │
│                                  │ (llvm-tblgen,        │
│                                  │  clang-tblgen)       │
│                                  ▼                      │
│                          build-browser-llvm.sh          │
│                          (via emscripten)               │
│                               │                         │
│                    ┌──────────┴──────────┐              │
│                    ▼                     ▼              │
│               clang.wasm           wasm-ld.wasm         │
└────────────────────┬────────────────────┬───────────────┘
                     │                    │
┌────────────────────▼────────────────────▼───────────────┐
│                   PACKAGING LAYER                       │
│                                                         │
│  validate-sysroot.sh ──► package-toolchain.sh           │
│                               │                         │
│                    generate-manifest.mjs                │
│                    generate-checksums.mjs               │
│                               │                         │
│                    cpp-wasm-toolchain-x.y.z.tar.gz      │
└───────────────────────────────┬─────────────────────────┘
                                │  (distributed via GitHub Releases)
┌───────────────────────────────▼─────────────────────────┐
│                    RUNTIME LAYER                        │
│                                                         │
│  IDE consumer (separate project)                        │
│       │                                                 │
│  packages/loader ──► fetch manifest, clang.wasm         │
│  packages/worker ──► Web Worker isolation               │
│  packages/runtime ─► WASI shim (stdin/stdout/stderr)    │
│                               │                         │
│                    student program output               │
└─────────────────────────────────────────────────────────┘
```

---

## Compilation Pipeline

When an IDE consumer compiles a C/C++ source file:

```
source.cpp
    │
    ▼
clang.wasm                  ← Clang compiler compiled to WebAssembly
    │   --target=wasm32-wasi
    │   --sysroot=sysroot/
    │   -O2
    │
    ▼
object.o                    ← WASM object file
    │
    ▼
wasm-ld.wasm                ← LLD linker compiled to WebAssembly
    │   sysroot/lib/wasm32-wasi/libc.a
    │   sysroot/lib/wasm32-wasi/libc++.a
    │   sysroot/lib/wasm32-wasi/libc++abi.a
    │   sysroot/lib/wasm32-wasi/libclang_rt.builtins-wasm32.a
    │
    ▼
program.wasm                ← Final WebAssembly binary
    │
    ▼
WASI runtime (wasi-shim.ts) ← Browser-side WASI environment
    │
    ├── stdout callback
    ├── stderr callback
    └── stdin buffer
```

**Target ABI**: `wasm32-wasi` (WASI command mode, entry point: `_start`)

**Supported STL (v1)**: `iostream`, `vector`, `algorithm`, `string`, `map`, `set`, `queue`, `stack`, `utility`, `cmath`, `cstdlib`, `cstdio`

**Not supported in v1**: `pthread`, exceptions, dynamic linking, filesystem I/O, Boost, source maps, LTO

---

## Packaging Pipeline

After the browser LLVM build completes, the packaging pipeline assembles a versioned release artifact:

```
validate-sysroot.sh
    │  checks: libc++.a, libc++abi.a, builtins, STL headers
    │  fail fast if any artifact is missing
    │
    ▼
package-toolchain.sh
    │
    ├── copy compiler/clang.mjs + clang.wasm
    ├── copy linker/wasm-ld.mjs + wasm-ld.wasm
    ├── copy sysroot/include/ + sysroot/lib/wasm32-wasi/
    ├── copy runtime/wasi-shim.js
    ├── copy examples/
    │
    ├── generate-manifest.mjs
    │       → manifest.json  (entry points, version, target)
    │
    ├── generate-checksums.mjs
    │       → checksums.txt  (SHA-256 for every file)
    │
    └── tar czf cpp-wasm-toolchain-x.y.z.tar.gz
```

**Release artifact layout** (fixed, must not change across patch versions):

```
cpp-wasm-toolchain/<version>/
    manifest.json
    checksums.txt
    compiler/
        clang.mjs
        clang.wasm
    linker/
        wasm-ld.mjs
        wasm-ld.wasm
    sysroot/
        include/
        lib/wasm32-wasi/
            libc.a
            libc++.a
            libc++abi.a
            libclang_rt.builtins-wasm32.a
    runtime/
        wasi-shim.js
    examples/
        hello.c
        hello.cpp
        vector_sort.cpp
```

---

## Runtime Execution Flow

Browser-side execution sequence (inside an IDE consumer):

```
1. IDE loads manifest.json from CDN / GitHub Release
        │
2. Toolchain loader fetches clang.wasm + wasm-ld.wasm
   (WebAssembly.compileStreaming, cached in IndexedDB)
        │
3. User submits source code
        │
4. Web Worker receives compile request
        │
5. clang.wasm runs in Worker
   → emits object.o bytes in WASI virtual filesystem
        │
6. wasm-ld.wasm runs in Worker
   → links object.o + sysroot libs → program.wasm bytes
        │
7. program.wasm is instantiated via WebAssembly.instantiate()
   → WASI shim (wasi-shim.ts) provides syscall layer:
       fd_write  → stdout/stderr callbacks
       fd_read   → stdin buffer
       proc_exit → throws WasiExitError
       clock_time_get → Date.now()
       random_get → crypto.getRandomValues()
        │
8. IDE receives stdout/stderr via callbacks
   (output size limit enforced: default 1 MiB)
        │
9. Execution timeout enforced: default 10 seconds
```

---

## Security Model

Student-submitted code runs inside **three nested isolation layers**:

```
Browser process
└── Web Worker (separate thread, no DOM access)
    └── WebAssembly sandbox (linear memory, no host pointers)
        └── WASI shim (explicit syscall allowlist)
```

### Isolation guarantees

| Threat | Mitigation |
|---|---|
| Host filesystem access | WASI shim returns `ENOSPC` / `EBADF` for all path syscalls |
| Host memory access | WebAssembly linear memory is fully sandboxed |
| Infinite loops | Execution timeout (configurable, default 10 s) |
| Output flooding | Max output size limit (default 1 MiB) |
| DOM manipulation | Web Worker has no DOM access |
| Network access | Web Worker can fetch; IDE should run in restrictive CSP |
| Native code execution | WebAssembly only — no JIT escape |

### What is NOT provided

- Bytecode verification of student WASM (trusted compile path only)
- Network isolation inside the worker (IDE consumer responsibility)
- Memory limits on compilation (clang.wasm may use several hundred MB)

---

## Package Dependency Graph

```
packages/
    runtime/          ← no dependencies
        wasi-shim.ts

    loader/           ← depends on: runtime
        index.ts
            Toolchain class
                .loadManifest()
                .loadCompiler()
                .loadLinker()
                .compile()
                .run()

    worker/           ← depends on: loader → runtime
        worker.ts
            WorkerRequest / WorkerResponse protocol
```

---

## Centralized Version Control

All dependency versions are pinned in a single file:

```
toolchain/config/versions.env
    LLVM_VERSION=18.1.0
    WASI_SDK_VERSION=30
    EMSDK_VERSION=3.1.64
    TOOLCHAIN_VERSION=0.1.0
```

Every build script must source this file. Hardcoding versions anywhere else is prohibited.

---

## Build Reproducibility

The build is designed to be fully deterministic:

- **Same commit + same `versions.env`** → same binary output
- All source fetches are tag-pinned (no `latest` in CI)
- `emsdk` version is fixed, not `latest`
- CMake build type is `MinSizeRel` (no debug symbols affecting size)
- No random seeds, timestamps, or host-specific paths embedded in artifacts

---

## Incremental Build Strategy

The build pipeline is split into stages that can be run independently:

```
Stage 1: fetch-sources.sh      (slow, one-time, ~5 GB disk)
Stage 2: build-sysroot.sh      (fast, extracts from wasi-sdk)
Stage 3: build-host-llvm.sh    (medium, ~20 min, tablegen only)
Stage 4: build-browser-llvm.sh (slow, ~60-120 min, highest risk)
Stage 5: validate-sysroot.sh   (instant, fail-fast check)
Stage 6: package-toolchain.sh  (fast, assembly + checksums)
Stage 7: smoke-test.sh         (fast, 5 compile tests)
```

**Milestone 4 (browser clang build) is the highest-risk step.** Validate `clang --version` in the browser before attempting a full compile pipeline.
