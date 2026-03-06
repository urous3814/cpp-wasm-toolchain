# cpp-wasm-toolchain

A browser-side C/C++ WebAssembly toolchain for web-based IDEs and education platforms.

This project builds and distributes a **C/C++ toolchain that runs entirely in the browser**, enabling code compilation and execution without installing native compilers.

The toolchain is distributed as a **versioned package via GitHub Releases** and consumed by any web IDE via the `packages/loader` API.

---

## Quick Start

### For IDE consumers

Download the latest release from GitHub Releases and point your loader at it:

```ts
import { Toolchain } from '@cpp-wasm-toolchain/loader'

const toolchain = new Toolchain('https://cdn.example.com/cpp-wasm-toolchain/0.1.0')

const result = await toolchain.compile({
    source: '#include <iostream>\nint main() { std::cout << "Hello!" << std::endl; }',
    filename: 'main.cpp',
    stdout: (s) => console.log(s),
    stderr: (s) => console.error(s),
})
```

### For toolchain developers

```bash
# 1. Bootstrap dependencies (macOS)
./toolchain/scripts/bootstrap-macos.sh

# 2. Fetch LLVM + wasi-sdk sources (~5 GB, one-time)
./toolchain/scripts/fetch-sources.sh

# 3. Build in order
./toolchain/scripts/build-sysroot.sh
./toolchain/scripts/build-host-llvm.sh

source emsdk/emsdk_env.sh   # required before browser LLVM build
./toolchain/scripts/build-browser-llvm.sh

# 4. Validate and package
./toolchain/scripts/validate-sysroot.sh
./toolchain/scripts/package-toolchain.sh

# 5. Run smoke tests
./toolchain/scripts/smoke-test.sh
```

See **[docs/build.md](docs/build.md)** for the full setup guide and troubleshooting.

---

## Architecture

The project is organized into three layers:

```
BUILD LAYER
    fetch-sources.sh → build-sysroot.sh
                     → build-host-llvm.sh
                     → build-browser-llvm.sh
                            │
                     clang.wasm + wasm-ld.wasm

PACKAGING LAYER
    validate-sysroot.sh → package-toolchain.sh
                              │
                     cpp-wasm-toolchain-x.y.z.tar.gz

RUNTIME LAYER (browser, inside IDE consumer)
    packages/loader  → fetch manifest + WASM binaries
    packages/worker  → Web Worker isolation
    packages/runtime → WASI shim (stdin/stdout/stderr/timeout)
```

**Compilation pipeline** (student code):

```
source.cpp → clang.wasm → object.o → wasm-ld.wasm → program.wasm → WASI runtime → stdout
```

**Target**: `wasm32-wasi` · **ABI**: WASI command mode (`_start`)

See **[docs/architecture.md](docs/architecture.md)** for full diagrams, runtime execution flow, and security model.

---

## Release Artifact Layout

```
cpp-wasm-toolchain/<version>/
    manifest.json         ← entry points and version info
    checksums.txt         ← SHA-256 for every file
    compiler/
        clang.mjs
        clang.wasm        ← ~20-40 MB
    linker/
        wasm-ld.mjs
        wasm-ld.wasm
    sysroot/
        include/          ← C/C++ headers
        lib/wasm32-wasi/  ← libc.a, libc++.a, libc++abi.a, builtins
    runtime/
        wasi-shim.js
    examples/
        hello.c
        hello.cpp
        vector_sort.cpp
```

---

## Supported STL (v1)

`iostream` · `vector` · `algorithm` · `string` · `map` · `set` · `queue` · `stack` · `utility` · `cmath` · `cstdlib` · `cstdio`

**Not supported in v1:** `pthread`, exceptions, dynamic linking, filesystem I/O, Boost, source maps, LTO

---

## Features

- C and C++ compilation in the browser (no server required)
- WebAssembly output via real LLVM/Clang
- WASI runtime with stdout/stderr capture, stdin buffer, timeout, output size limit
- Versioned, immutable release artifacts
- GitHub Releases packaging with SHA-256 checksums
- GitHub Pages demo
- Web Worker isolation for compilation

---

## Demo

A minimal demo is available on GitHub Pages. It allows writing C/C++ code, compiling in the browser, and viewing program output.

---

## Documentation

| Document | Description |
|---|---|
| [docs/architecture.md](docs/architecture.md) | System architecture, pipelines, security model |
| [docs/roadmap.md](docs/roadmap.md) | Milestones and definitions of done |
| [docs/build.md](docs/build.md) | macOS/Linux setup, build steps, troubleshooting |

---

## Development Status

Currently at **Milestone 1** (repository foundation). Build scripts and packages are scaffolded. The browser LLVM build (Milestone 4) is the highest-risk step.

See [docs/roadmap.md](docs/roadmap.md) for the full milestone plan.

---

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`

Releases are immutable. Never modify a published release — create a new version instead.

---

## Limitations (v1)

- No threads / pthread
- No C++ exceptions
- No dynamic linking
- No filesystem I/O
- No Boost
- No source maps
- No LTO

---

## License

MIT
