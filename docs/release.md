# Release Guide

## Version Bump

All versions are defined in one place:

```
toolchain/config/versions.env
```

To bump the toolchain version:

```bash
# 1. Create a release branch from develop
git checkout develop && git pull origin develop
git checkout -b release/v<X.Y.Z>

# 2. Edit versions.env
# TOOLCHAIN_VERSION=<X.Y.Z>

# 3. Commit
git commit -m "chore: bump TOOLCHAIN_VERSION to <X.Y.Z>"

# 4. Open PR targeting develop
# After CI passes and PR merges, continue below.
```

---

## Tag Naming

Tags follow semantic versioning with a `v` prefix:

```
v0.1.0
v0.2.0
v1.0.0
```

Tags are applied to `main` only after `develop` is merged there.

---

## Release Process

### Step 1 — Merge develop → main

After all milestone work is merged to `develop` and CI is green:

```bash
git checkout main
git merge --no-ff develop -m "release: merge develop into main for v<X.Y.Z>"
git push origin main
```

### Step 2 — Tag

```bash
git tag v<X.Y.Z>
git push origin v<X.Y.Z>
```

Pushing the tag triggers `release.yml`, which runs the full build pipeline
and uploads the release artifact to GitHub Releases automatically.

### Step 3 — Monitor CI

Watch the Actions run for the `v*` tag. Expected pipeline duration: 90–175 minutes.

The pipeline runs in this order:
1. Install system dependencies and emsdk
2. Fetch sources (llvm-project, wasi-sdk, emsdk)
3. Build sysroot → validate sysroot
4. Build host LLVM (tablegen tools)
5. Build browser LLVM (clang.wasm + wasm-ld.wasm)
6. Run `verify-build-stage.sh`
7. Build runtime package
8. Package toolchain → verify package
9. Upload `.tar.gz` as workflow artifact (debug)
10. Create GitHub Release with the tarball

---

## Expected Release Artifact

```
cpp-wasm-toolchain-<version>.tar.gz
└── cpp-wasm-toolchain/<version>/
    ├── manifest.json
    ├── checksums.txt
    ├── compiler/
    │   ├── clang.wasm
    │   └── clang.mjs          (if emscripten emits it)
    ├── linker/
    │   ├── wasm-ld.wasm
    │   └── wasm-ld.mjs        (if emscripten emits it)
    ├── runtime/
    │   └── wasi-shim.js
    ├── sysroot/
    │   ├── include/
    │   └── lib/wasm32-wasi/
    └── examples/
        ├── hello.c
        ├── hello.cpp
        └── vector_sort.cpp
```

---

## Verification After Release

### 1. Confirm the release exists on GitHub

```bash
gh release view v<X.Y.Z>
```

### 2. Download and verify checksums

```bash
curl -L https://github.com/<org>/cpp-wasm-toolchain/releases/download/v<X.Y.Z>/cpp-wasm-toolchain-<X.Y.Z>.tar.gz \
  -o cpp-wasm-toolchain-<X.Y.Z>.tar.gz

tar xzf cpp-wasm-toolchain-<X.Y.Z>.tar.gz
cd cpp-wasm-toolchain/<X.Y.Z>/

sha256sum --check checksums.txt
# All lines should print: OK
```

### 3. Validate manifest fields

```bash
cat manifest.json
# Verify: name, version, target, compiler.wasm, linker.wasm, sysroot.include
```

### 4. Run local verify-package

```bash
TOOLCHAIN_VERSION=<X.Y.Z> ./toolchain/scripts/verify-package.sh
# [package] verification passed
```

---

## Immutability Rule

Once a version tag is pushed and the release is created, **never modify the
artifacts**. If a fix is required, create a new patch version (`X.Y.Z+1`).

See [repository-rules.md](repository-rules.md) for the full immutability rule.
