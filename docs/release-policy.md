# Release Policy

This document defines the rules governing how releases of the cpp-wasm-toolchain
are prepared, validated, tagged, and published. For step-by-step operational
instructions, see [docs/release.md](release.md).

---

## What a Release Contains

Each release is a single versioned archive:

```
cpp-wasm-toolchain-<version>.tar.gz
└── cpp-wasm-toolchain/<version>/
    ├── manifest.json       — entry points and version metadata
    ├── checksums.txt       — SHA-256 hash for every file in the archive
    ├── compiler/
    │   ├── clang.wasm      — Clang compiled to WebAssembly (~20–40 MB)
    │   └── clang.mjs       — Emscripten JS glue (if emitted)
    ├── linker/
    │   ├── wasm-ld.wasm    — wasm-ld compiled to WebAssembly
    │   └── wasm-ld.mjs     — Emscripten JS glue (if emitted)
    ├── runtime/
    │   └── wasi-shim.js    — browser WASI environment shim
    ├── sysroot/
    │   ├── include/        — C/C++ system headers
    │   └── lib/wasm32-wasi/— libc.a, libc++.a, libc++abi.a, builtins
    └── examples/
        ├── hello.c
        ├── hello.cpp
        └── vector_sort.cpp
```

`manifest.json` and `checksums.txt` are the source of truth for artifact
identity. Consumer projects must reference paths through `manifest.json` — never
hardcode relative `.wasm` paths.

---

## Versioning Policy

All versions follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

The single authoritative version value is `TOOLCHAIN_VERSION` in
`toolchain/config/versions.env`.

| Component | When to increment |
|-----------|------------------|
| **MAJOR** | The release artifact layout changes in a way that breaks existing consumers (renamed required files, removed fields in `manifest.json`, changed WASI ABI target). |
| **MINOR** | New optional artifacts, new supported STL headers, new sysroot libraries, or new loader/worker API surface that is backwards-compatible. |
| **PATCH** | Bug fixes, script corrections, sysroot fixes, CI corrections, or documentation updates that do not affect the artifact layout or public API. |

**Rules:**

- Never increment `MAJOR` without updating `docs/architecture.md` to document
  the breaking change and its migration path.
- A version bump must be a deliberate, reviewable commit — not a side effect of
  unrelated work.
- `LLVM_VERSION`, `WASI_SDK_VERSION`, and `EMSDK_VERSION` are dependency pins,
  not the toolchain version. Updating a dependency pin alone is typically a
  `PATCH` bump.

---

## Release Branch Policy

```
feature/* ──┐
fix/*     ──┤──► develop ──► release/* ──► develop ──► main ──► v*  tag
docs/*    ──┘
```

**Intended flow:**

1. All normal development happens in `feature/*`, `fix/*`, or `docs/*` branches
   cut from `develop`.
2. Completed work merges into `develop` via pull request after CI passes.
3. When development for a version is complete, a `release/<version>` branch is
   cut from `develop` for release hardening:
   - Version bump in `versions.env`
   - Final smoke run
   - Release notes preparation
   - No new feature work in this branch
4. The `release/<version>` branch merges back into `develop` (and then `develop`
   merges into `main`) only after all pre-release checks pass.
5. A `vX.Y.Z` tag is pushed to `main`. The tag push triggers `release.yml`.

**Rules:**

- Tags must correspond to a verified, CI-green commit on `main`.
- Do not tag a commit that has not been merged through the full branch flow.
- Do not create release tags on `develop`, `feature/*`, or any other branch.
- A `release/*` branch is short-lived. Merge and delete it promptly.

---

## Pre-Release Checklist

All items must be confirmed before tagging a release:

**CI and structure**
- [ ] `ci.yml` is green on the release commit
- [ ] `bash -n toolchain/scripts/*.sh` passes — no syntax errors in any script
- [ ] `toolchain/config/versions.env` is correct and `TOOLCHAIN_VERSION` matches
  the intended release version

**Artifact validation**
- [ ] `./toolchain/scripts/validate-sysroot.sh` exits 0 — confirms `libc++.a`,
  `libc++abi.a`, builtins, and STL headers are present
- [ ] `clang.wasm` and `wasm-ld.wasm` are present in the expected build output
  directory and respond to `--version` in the browser smoke test
- [ ] `pnpm typecheck` exits 0 — no TypeScript errors in `packages/`

**Smoke tests**
- [ ] `tests/smoke/hello.c` compiles and produces correct stdout
- [ ] `tests/smoke/hello.cpp` compiles and produces correct stdout
- [ ] `tests/smoke/vector_sort.cpp` compiles and produces correct sorted output
- [ ] `tests/smoke/compile_error.cpp` produces a non-empty compiler error and
  does not crash the runtime

**Package verification**
- [ ] `./toolchain/scripts/package-toolchain.sh` completes without error
- [ ] `checksums.txt` is present in the archive and all lines verify as OK via
  `sha256sum --check checksums.txt`
- [ ] `manifest.json` contains correct `version`, `compiler.wasm`, `linker.wasm`,
  and `sysroot.include` fields

**Release notes**
- [ ] Release notes summarize what changed since the previous version
- [ ] Known limitations or regressions are documented

**Documentation**
- [ ] `docs/architecture.md` reflects the current artifact layout if it changed
- [ ] `docs/build.md` reflects any changed build prerequisites or commands
- [ ] `docs/roadmap.md` is updated if a milestone was completed

---

## Tagging and Publishing

**Tag format:**

```
v<MAJOR>.<MINOR>.<PATCH>
```

Examples: `v0.1.0`, `v0.2.0`, `v1.0.0`

**Rules:**

- Tags are created on `main` only, after `develop` has been merged and CI is
  confirmed green.
- Pushing a `v*` tag triggers the `release.yml` workflow automatically. Do not
  trigger the release workflow manually unless debugging a pipeline failure.
- The workflow uploads a single asset named exactly:

  ```
  cpp-wasm-toolchain-<version>.tar.gz
  ```

  Do not rename or reformat this asset name. Consumer projects resolve the
  download URL from this naming convention.

- Once a release is published, its assets are immutable. Do not re-upload,
  overwrite, or delete assets from a published GitHub Release. If the artifacts
  are wrong, publish a new patch version.
- Do not create pre-release or draft releases for integration testing. Use local
  builds and branch CI for that purpose.

---

## Post-Release Verification

After the `release.yml` run completes, verify the following:

**GitHub Release**
```bash
gh release view v<X.Y.Z>
# Confirms: tag, title, uploaded asset name and size
```

**Checksum integrity**
```bash
curl -L <release-asset-url> -o cpp-wasm-toolchain-<X.Y.Z>.tar.gz
tar xzf cpp-wasm-toolchain-<X.Y.Z>.tar.gz
cd cpp-wasm-toolchain/<X.Y.Z>/
sha256sum --check checksums.txt
# Every line must print: OK
```

**Manifest correctness**
```bash
cat manifest.json
# Confirm: version matches X.Y.Z, compiler/linker/sysroot paths are present
```

**Package script verification**
```bash
TOOLCHAIN_VERSION=<X.Y.Z> ./toolchain/scripts/verify-package.sh
# Expected: [package] verification passed
```

**Demo (if applicable)**
- Confirm the GitHub Pages demo still loads and that any version reference in
  `demo/` points to the correct versioned asset path for this release.

---

## Rollback and Fix Strategy

There is no in-place rollback mechanism. GitHub Release artifacts are immutable.

**If a bad release is discovered:**

1. **Do not delete or overwrite** the existing release. Consumers may have
   already downloaded it.
2. **Document the issue** in the GitHub Release description as a known problem,
   with a pointer to the fix version.
3. **Create a new patch version** (`PATCH + 1`) with the fix applied:
   ```bash
   git checkout develop
   git checkout -b fix/release-v<X.Y.Z+1>-<short-description>
   # apply fix
   git push -u origin fix/release-v<X.Y.Z+1>-<short-description>
   # open PR, merge to develop, follow normal release flow
   ```
4. **Release the patch version** through the normal pre-release checklist and
   tagging process.
5. **Update the release notes** of the bad release to recommend upgrading to
   the patch version.

---

## Related Documents

- [docs/build.md](build.md) — build prerequisites, build steps, troubleshooting
- [docs/repository-rules.md](repository-rules.md) — engineering rules including
  immutability, determinism, and fail-fast requirements
- [docs/contributing.md](contributing.md) — commit convention, branch naming,
  and PR requirements
