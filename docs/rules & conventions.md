# 1️⃣ Repository Starter Template

아래는 **초기 레포 스켈레톤**입니다.

```
cpp-wasm-toolchain/
│
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .editorconfig
├─ .gitattributes
│
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.json
│
├─ docs/
│  ├─ architecture.md
│  ├─ roadmap.md
│  └─ build.md
│
├─ toolchain/
│  ├─ config/
│  │  ├─ versions.env
│  │  └─ build.env
│  │
│  ├─ scripts/
│  │  ├─ bootstrap-macos.sh
│  │  ├─ fetch-sources.sh
│  │  ├─ build-sysroot.sh
│  │  ├─ build-host-llvm.sh
│  │  ├─ build-browser-llvm.sh
│  │  ├─ validate-sysroot.sh
│  │  ├─ package-toolchain.sh
│  │  ├─ generate-manifest.mjs
│  │  ├─ generate-checksums.mjs
│  │  └─ smoke-test.sh
│  │
│  └─ workspace/
│     ├─ src/
│     ├─ build/
│     └─ out/
│
├─ packages/
│  ├─ runtime/
│  │  ├─ package.json
│  │  └─ src/
│  │     └─ wasi-shim.ts
│  │
│  ├─ loader/
│  │  ├─ package.json
│  │  └─ src/
│  │     └─ index.ts
│  │
│  └─ worker/
│     ├─ package.json
│     └─ src/
│        └─ worker.ts
│
├─ examples/
│  ├─ hello.c
│  ├─ hello.cpp
│  └─ vector_sort.cpp
│
├─ demo/
│  ├─ index.html
│  ├─ main.ts
│  └─ style.css
│
├─ tests/
│  └─ smoke/
│
├─ dist/
│
└─ .github/
   ├─ workflows/
   │  ├─ ci.yml
   │  ├─ release.yml
   │  └─ pages.yml
   │
   ├─ ISSUE_TEMPLATE/
   │  ├─ bug.yml
   │  └─ feature.yml
   │
   └─ PULL_REQUEST_TEMPLATE.md
```

---

# 2️⃣ 핵심 파일 템플릿

## package.json

```json
{
  "name": "cpp-wasm-toolchain",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "bootstrap": "./toolchain/scripts/bootstrap-macos.sh",
    "build:sysroot": "./toolchain/scripts/build-sysroot.sh",
    "build:llvm-host": "./toolchain/scripts/build-host-llvm.sh",
    "build:llvm-browser": "./toolchain/scripts/build-browser-llvm.sh",
    "package": "./toolchain/scripts/package-toolchain.sh",
    "test": "./toolchain/scripts/smoke-test.sh"
  }
}
```

---

## versions.env

```bash
LLVM_VERSION=18.1.0
WASI_SDK_VERSION=30
EMSDK_VERSION=3.1.64

TOOLCHAIN_VERSION=0.1.0
```

---

## bootstrap-macos.sh

```bash
#!/usr/bin/env bash
set -e

echo "Installing dependencies"

brew install cmake ninja git node python rust

if [ ! -d "emsdk" ]; then
  git clone https://github.com/emscripten-core/emsdk.git
fi

cd emsdk
./emsdk install latest
./emsdk activate latest
```

---

## generate-manifest.mjs

```javascript
import fs from "fs";

const version = process.env.TOOLCHAIN_VERSION || "0.1.0";

const manifest = {
  name: "cpp-wasm-toolchain",
  version,
  target: "wasm32-wasi",
  compiler: {
    entry: "compiler/clang.mjs",
    wasm: "compiler/clang.wasm",
  },
  linker: {
    entry: "linker/wasm-ld.mjs",
    wasm: "linker/wasm-ld.wasm",
  },
  runtime: {
    entry: "runtime/wasi-shim.js",
  },
};

fs.writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2));
```

---

## wasi-shim.ts

```ts
export async function runWasi(
  wasm: WebAssembly.Module,
  opts: {
    stdin?: string;
    stdout?: (s: string) => void;
    stderr?: (s: string) => void;
    timeoutMs?: number;
  },
) {
  const wasi = new (globalThis as any).WASI({
    args: [],
    env: {},
    bindings: {
      ...(globalThis as any).WASI.defaultBindings,
    },
  });

  const instance = await WebAssembly.instantiate(wasm, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  wasi.start(instance);
}
```

---

## demo/main.ts

```ts
import { runWasi } from "../packages/runtime/src/wasi-shim";

async function run() {
  const source = (document.getElementById("code") as HTMLTextAreaElement).value;

  console.log("compile stub:", source);
}

document.getElementById("run")?.addEventListener("click", run);
```

---

# 3️⃣ Development Ruleset

이 프로젝트는 **Strict Engineering Rules**를 사용합니다.

## Rule 1 — Deterministic Build

모든 빌드는 다음 조건을 만족해야 합니다.

```
same commit
same config
same artifact
```

재현 불가능한 빌드는 허용되지 않습니다.

---

## Rule 2 — Immutable Releases

릴리스 파일은 **절대 수정하지 않는다**.

```
v0.1.0
v0.1.1
```

새 버전을 만든다.

---

## Rule 3 — Fail Fast

빌드 단계에서 필요한 artifact가 없으면 즉시 실패해야 합니다.

예:

```
missing libc++
missing sysroot headers
missing clang wasm
```

---

## Rule 4 — Version Control

모든 주요 dependency는 명시된 버전을 사용합니다.

```
LLVM
wasi-sdk
emscripten
```

---

## Rule 5 — No Hidden Magic

모든 build script는 다음을 명확히 보여야 합니다.

```
input
output
dependencies
```

---

# 4️⃣ Commit Convention

**Conventional Commits** 기반입니다.

## Commit format

```
type(scope): description
```

예:

```
feat(toolchain): add wasm clang build
fix(runtime): wasi stdout bug
chore(ci): add release workflow
docs: update architecture
```

---

## Allowed types

```
feat
fix
chore
docs
refactor
build
ci
test
perf
```

---

## Examples

```
feat(sysroot): add wasi-sdk sysroot build

fix(compiler): clang wasm load issue

ci(release): upload artifact to GitHub Releases

docs: add architecture diagram
```

---

# 5️⃣ Branch Strategy

```
main
develop
feature/*
fix/*
release/*
```

---

## main

production ready

---

## develop

integration branch

---

## feature branch

```
feature/browser-clang-build
```

---

## bugfix

```
fix/wasi-runtime
```

---

# 6️⃣ Pull Request Rules

모든 PR은 다음을 만족해야 합니다.

- CI pass
- smoke test pass
- lint pass
- commit convention 준수

---

## PR Template

```
## Summary

Describe the change.

## Changes

- change 1
- change 2

## Tests

- smoke test
- example compile

## Checklist

[ ] CI passed
[ ] documentation updated
[ ] commit messages follow convention
```

---

# 7️⃣ Claude Code Ruleset

Claude Code에게 다음 **system prompt**를 줍니다.

```
You are implementing a production-grade open source repository.

Follow these rules:

1. Always follow the repository architecture.
2. Never bypass build reproducibility.
3. Fail fast if required build artifacts are missing.
4. Use Conventional Commits for all commits.
5. Keep scripts deterministic and readable.
6. Avoid hidden dependencies.
7. Prefer small incremental commits.
8. Do not silently ignore build failures.
9. Respect repository folder structure.
10. Ensure smoke tests run before packaging.

This repository is NOT the IDE.
This repository builds and distributes a browser C/C++ toolchain package.
```

---

# 8️⃣ GitHub Actions Template

## CI workflow

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install deps
        run: sudo apt-get install cmake ninja-build nodejs

      - name: Smoke test
        run: ./toolchain/scripts/smoke-test.sh
```

---

## Release workflow

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build toolchain
        run: ./toolchain/scripts/package-toolchain.sh

      - name: Upload artifact
        uses: softprops/action-gh-release@v1
```

---

# 9️⃣ Claude Code 실행 단계

Claude Code에게는 아래 순서로 시킵니다.

```
Step 1
Create repository skeleton

Step 2
Generate documentation

Step 3
Implement build scripts

Step 4
Implement runtime shim

Step 5
Implement packaging

Step 6
Implement CI/CD

Step 7
Implement demo site
```

---

# 🔟 가장 중요한 현실 조언

이 프로젝트에서 **진짜 난이도는 하나입니다.**

```
clang → wasm
```

여기입니다.

이게 성공하면 프로젝트는 **80% 성공**입니다.

---

# 추가로 권장하는 것

Claude Code에게 **이것도 같이 시키세요.**

```
create BUILD_DEBUG.md
```

여기에

```
common build failures
llvm build issues
emscripten issues
```

정리하게 하세요.
