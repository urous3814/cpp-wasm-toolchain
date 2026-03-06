# Build Guide

This guide walks through setting up a local build environment and producing a working `clang.wasm` + `wasm-ld.wasm`.

---

## Prerequisites

### System requirements

- **OS**: macOS 13+ (Ventura or later) or Ubuntu 22.04+
- **RAM**: 16 GB minimum, 32 GB recommended (LLVM build is memory-intensive)
- **Disk**: 20 GB free space (sources ~5 GB, build artifacts ~10 GB, output ~2 GB)
- **CPU**: Multi-core strongly recommended — build times scale with core count

---

## Required Tools

| Tool | Version | Purpose |
|---|---|---|
| `cmake` | 3.20+ | Build system generator |
| `ninja` | 1.11+ | Fast parallel build executor |
| `git` | 2.x | Source control and fetching LLVM |
| `node` | 18+ | Run `.mjs` packaging scripts |
| `python` | 3.10+ | Required by emscripten |
| `rust` | 1.70+ | Required by some LLVM build targets |
| `emscripten (emsdk)` | 3.1.64 | Cross-compile LLVM to WebAssembly |

---

## macOS Setup

### Step 1 — Install Homebrew tools

```bash
brew install cmake ninja git node python rust
```

Verify versions:

```bash
cmake --version    # cmake version 3.x.x
ninja --version    # 1.x.x
node --version     # v18.x.x or higher
python3 --version  # Python 3.x.x
rustc --version    # rustc 1.x.x
```

### Step 2 — Run bootstrap script

The bootstrap script installs the above dependencies and sets up emsdk:

```bash
./toolchain/scripts/bootstrap-macos.sh
```

This will:
1. Install brew packages (if not already installed)
2. Clone `emsdk` into the repo root
3. Install and activate emsdk version `3.1.64`

### Step 3 — Activate emscripten environment

After bootstrap, activate the emscripten environment in your shell. You must do this in every new terminal session before running browser LLVM builds:

```bash
source emsdk/emsdk_env.sh
```

Verify:

```bash
emcc --version  # emcc (Emscripten gcc/clang-like replacement) 3.1.64
```

---

## Build Steps

Run scripts in this exact order. Each step depends on the previous.

### Step 1 — Fetch sources

Downloads LLVM source and wasi-sdk. This is slow (~5 GB download) but only needs to run once.

```bash
./toolchain/scripts/fetch-sources.sh
```

Downloads to:
- `toolchain/workspace/src/llvm-project/` — LLVM 18.1.0 (depth 1 clone)
- `toolchain/workspace/src/wasi-sdk/` — wasi-sdk 21 (macOS binary)

### Step 2 — Build sysroot

Extracts the WASI sysroot from the wasi-sdk download.

```bash
./toolchain/scripts/build-sysroot.sh
```

Output: `toolchain/workspace/out/sysroot/`

Takes ~30 seconds.

### Step 3 — Build host LLVM

Builds native `llvm-tblgen` and `clang-tblgen` tools. These run on your Mac and are required by the cross-compilation step.

```bash
./toolchain/scripts/build-host-llvm.sh
```

Output: `toolchain/workspace/out/host-llvm/bin/llvm-tblgen`, `clang-tblgen`

Takes ~20–40 minutes depending on CPU.

Verify:

```bash
./toolchain/workspace/out/host-llvm/bin/llvm-tblgen --version
# LLVM version 18.1.0
```

### Step 4 — Build browser LLVM

Compiles Clang and LLD to WebAssembly using emscripten. This is the longest step.

```bash
source emsdk/emsdk_env.sh   # required before this step
./toolchain/scripts/build-browser-llvm.sh
```

Output:
- `toolchain/workspace/out/browser-llvm/clang.wasm`
- `toolchain/workspace/out/browser-llvm/clang.mjs`
- `toolchain/workspace/out/browser-llvm/wasm-ld.wasm`
- `toolchain/workspace/out/browser-llvm/wasm-ld.mjs`

Takes **60–120 minutes**. Watch for OOM errors if RAM < 16 GB.

Verify:

```bash
ls -lh toolchain/workspace/out/browser-llvm/clang.wasm
# Should be 20–40 MB
```

### Step 5 — Validate sysroot

Confirms all required libraries and headers are present before packaging.

```bash
./toolchain/scripts/validate-sysroot.sh
```

This checks for:
- `libc++.a`, `libc++abi.a`, `libclang_rt.builtins-wasm32.a`
- STL headers: `iostream`, `vector`, `algorithm`, `string`, `map`, `set`, `queue`, `stack`

Exits 0 on success, exits 1 with a descriptive error if anything is missing.

### Step 6 — Package toolchain

Assembles the release artifact.

```bash
./toolchain/scripts/package-toolchain.sh
```

Output: `dist/cpp-wasm-toolchain-0.1.0.tar.gz`

Takes ~1 minute.

### Step 7 — Run smoke tests

Validates that the built toolchain can actually compile real programs.

```bash
./toolchain/scripts/smoke-test.sh
```

Tests run:
- `hello.c` — basic C stdio
- `hello.cpp` — C++ iostream
- `vector_sort.cpp` — vector + algorithm
- `string_map.cpp` — string + map
- `compile_error.cpp` — must produce a non-empty error, not crash

All 5 must pass before packaging is considered complete.

---

## npm Script Aliases

The above steps can also be run via npm:

```bash
npm run build:sysroot       # Step 2
npm run build:llvm-host     # Step 3
npm run build:llvm-browser  # Step 4
npm run package             # Steps 5+6
npm run test                # Step 7
```

---

## Troubleshooting

### `emcc: command not found`

You forgot to source the emsdk environment:

```bash
source emsdk/emsdk_env.sh
```

### Host LLVM build runs out of memory

Reduce parallel jobs in `toolchain/config/build.env`:

```bash
PARALLEL_JOBS=4   # default: nproc (all cores)
```

### Browser LLVM build fails with `tablegen not found`

`build-host-llvm.sh` must complete successfully before `build-browser-llvm.sh`. Verify:

```bash
ls toolchain/workspace/out/host-llvm/bin/llvm-tblgen
ls toolchain/workspace/out/host-llvm/bin/clang-tblgen
```

### `validate-sysroot.sh` fails: missing `libc++.a`

The sysroot from wasi-sdk 21 includes these libraries. If they're missing, the wasi-sdk download may have been incomplete or the wrong binary was downloaded. Re-run:

```bash
rm -rf toolchain/workspace/src/wasi-sdk
./toolchain/scripts/fetch-sources.sh
./toolchain/scripts/build-sysroot.sh
```

### `clang.wasm` is 0 bytes or missing

The emscripten build failed silently. Check build logs:

```bash
# Re-run with verbose output
ninja -C toolchain/workspace/build/browser-llvm -v clang 2>&1 | tail -100
```

### Build disk space exhaustion

Intermediate build artifacts are large. Clean up:

```bash
rm -rf toolchain/workspace/build/       # ~8 GB build artifacts
# Keep toolchain/workspace/src/ and out/ to avoid re-downloading/rebuilding
```

---

## Ubuntu / Linux Setup

The scripts are written for macOS but work on Ubuntu with minor adjustments:

```bash
sudo apt-get install cmake ninja-build git nodejs npm python3 rustc cargo

# emsdk setup (same as macOS)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install 3.1.64
./emsdk activate 3.1.64
source ./emsdk_env.sh
```

For the wasi-sdk download, `fetch-sources.sh` currently downloads the macOS binary. On Linux, change the URL suffix from `macos` to `linux`:

```bash
# In toolchain/scripts/fetch-sources.sh, change:
# wasi-sdk-${WASI_SDK_VERSION}.0-macos.tar.gz
# to:
# wasi-sdk-${WASI_SDK_VERSION}.0-linux.tar.gz
```

---

## CI Build Notes

GitHub Actions (`release.yml`) runs the full pipeline on `ubuntu-latest`. The CI build takes approximately:

| Step | Estimated time |
|---|---|
| Install deps | 2 min |
| Fetch sources | 5–10 min (cached) |
| Build sysroot | 1 min |
| Build host LLVM | 25–40 min |
| Build browser LLVM | 60–120 min |
| Package + smoke test | 2 min |

**Total: ~90–175 minutes** per release build.
