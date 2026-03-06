# C/C++ Browser WASM Toolchain OSS 프로젝트 최종 명세서

## 1. 프로젝트 목적

이 프로젝트는 **브라우저에서 C/C++ 코드를 컴파일하고 실행할 수 있는 독립형 WebAssembly 툴체인 패키지**를 오픈소스로 제공하는 것을 목표로 한다.

이 프로젝트는 서비스 본체와 완전히 분리된다.

즉 구조는 다음과 같다.

- 이 저장소는 **브라우저용 C/C++ 툴체인 패키지**를 만든다.
- 배포는 **GitHub Releases**로 한다.
- 간단한 사용 예시와 동작 확인을 위한 **GitHub Pages 데모 사이트**를 제공한다.
- 실제 웹 서비스/IDE는 이 패키지를 다운로드해서 사용한다.

---

## 2. 프로젝트 범위

이 프로젝트가 담당하는 범위는 아래와 같다.

### 포함

- 브라우저용 clang wasm 패키징
- 브라우저용 wasm-ld wasm 패키징
- C/C++용 WASI sysroot 패키징
- manifest.json 생성
- checksums 생성
- GitHub Actions 기반 CI/CD
- GitHub Release 업로드
- GitHub Pages 데모
- smoke test
- 문서화

### 제외

- 실제 교육 플랫폼 UI
- 문제 풀이 플랫폼 로직
- 사용자 인증
- 백엔드
- 저장 기능
- 코드 에디터 고급 기능

즉, **이 저장소는 툴체인 제품 저장소**다.

---

## 3. 최종 목표물

최종적으로 생성되는 산출물은 다음 두 종류다.

### 3.1 Release Artifact

GitHub Release에 업로드되는 버전 고정 툴체인 패키지

예시:

```text
cpp-wasm-toolchain-0.1.0.tar.gz
```

### 3.2 GitHub Pages Demo

브라우저에서 패키지를 실제로 로드해서 C/C++ 코드를 실행해보는 간단한 데모 사이트

---

## 4. 지원 대상

## 4.1 지원 언어

- C
- C++

## 4.2 지원 수준

교육용/알고리즘 문제 풀이 수준의 C/C++

즉 아래 정도를 지원 대상으로 본다.

- `iostream`
- `vector`
- `algorithm`
- `string`
- `map`
- `set`
- `queue`
- `stack`
- `utility`
- `cmath`
- `cstdlib`
- `cstdio`

## 4.3 비목표

v1에서는 아래는 지원 목표에 포함하지 않는다.

- pthread
- dynamic linking
- exceptions
- filesystem
- Boost
- native OS 기능
- multithreading
- advanced debugging
- source maps
- LTO

---

## 5. 실행 모델

## 5.1 학생 코드 타깃

학생이 작성한 C/C++ 코드는 다음 타깃으로 컴파일한다.

```text
wasm32-wasi
```

## 5.2 실행 ABI

v1에서는 **WASI command mode**를 사용한다.

즉 최종 실행 wasm은 `_start` 엔트리 기반 executable로 만든다.

이유는 다음과 같다.

- 가장 단순하다.
- WASI stdin/stdout 연결이 명확하다.
- 브라우저 데모 구현이 쉬워진다.
- v1에서 reactor/custom ABI까지 가면 복잡도가 급증한다.

---

## 6. 기술 선택

## 6.1 sysroot

`wasi-sdk` 기반으로 구축한다.

이유:

- `wasi-libc`
- `libc++`
- `libc++abi`
- builtins
- headers / libs

를 비교적 일관되게 확보할 수 있다.

## 6.2 브라우저용 compiler/linker

목표는 다음이다.

- `clang` → browser-usable wasm module
- `wasm-ld` → browser-usable wasm module

여기서 주의할 점이 있다.

**이 부분은 프로젝트에서 가장 어려운 구간이다.**
그래서 문서와 구현 모두 아래 단계로 나눈다.

### v1 목표

- 브라우저에서 실행 가능한 clang/wasm-ld 모듈을 산출하는 reproducible build pipeline 확보
- 최소한 hello world와 STL 예제를 컴파일/실행 가능하게 만들기

### v1.1~v1.2 이후

- 크기 최적화
- 부트 시간 최적화
- sysroot 패키징 고도화
- 캐시 친화적 구조

---

## 7. 저장소 구조 최종안

```text
cpp-wasm-toolchain/
├─ README.md
├─ LICENSE
├─ .gitignore
├─ .gitattributes
├─ package.json
├─ pnpm-lock.yaml                 # 또는 npm/yarn 중 하나로 통일
├─ tsconfig.json                  # Node 스크립트 TypeScript 사용 시
│
├─ docs/
│  ├─ architecture.md
│  ├─ build.md
│  ├─ release.md
│  ├─ demo.md
│  └─ roadmap.md
│
├─ toolchain/
│  ├─ README.md
│  ├─ config/
│  │  ├─ versions.env
│  │  ├─ build.env
│  │  └─ package.env
│  │
│  ├─ patches/
│  │  ├─ llvm/
│  │  └─ wasi-sdk/
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
│  │  ├─ smoke-test-local.sh
│  │  ├─ prepare-demo-assets.sh
│  │  └─ upload-release.sh
│  │
│  ├─ workspace/
│  │  ├─ src/
│  │  ├─ build/
│  │  ├─ out/
│  │  └─ cache/
│  │
│  └─ templates/
│     └─ manifest.template.json
│
├─ packages/
│  ├─ runtime/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ wasi-shim.ts
│  │  │  ├─ fs.ts
│  │  │  ├─ stdio.ts
│  │  │  ├─ timeout.ts
│  │  │  └─ types.ts
│  │  └─ dist/
│  │
│  ├─ loader/
│  │  ├─ package.json
│  │  ├─ src/
│  │  │  ├─ manifest.ts
│  │  │  ├─ fetcher.ts
│  │  │  ├─ compiler.ts
│  │  │  ├─ linker.ts
│  │  │  ├─ execute.ts
│  │  │  └─ index.ts
│  │  └─ dist/
│  │
│  └─ worker-demo/
│     ├─ package.json
│     ├─ src/
│     │  ├─ worker.ts
│     │  └─ messages.ts
│     └─ dist/
│
├─ examples/
│  ├─ hello.c
│  ├─ hello.cpp
│  ├─ vector_sort.cpp
│  ├─ string_map.cpp
│  └─ compile_error.cpp
│
├─ tests/
│  ├─ smoke/
│  │  ├─ hello.test.ts
│  │  ├─ vector_sort.test.ts
│  │  ├─ string_map.test.ts
│  │  └─ compile_error.test.ts
│  └─ fixtures/
│
├─ demo/
│  ├─ index.html
│  ├─ main.ts
│  ├─ style.css
│  ├─ vite.config.ts
│  └─ public/
│
├─ dist/                          # 최종 패키지 출력
│
└─ .github/
   ├─ workflows/
   │  ├─ ci.yml
   │  ├─ release.yml
   │  └─ pages.yml
   └─ ISSUE_TEMPLATE/
```

---

## 8. Release Artifact 구조

최종 배포 tarball 내부 구조는 아래처럼 고정한다.

```text
cpp-wasm-toolchain/
├─ manifest.json
├─ checksums.txt
│
├─ compiler/
│  ├─ clang.mjs
│  └─ clang.wasm
│
├─ linker/
│  ├─ wasm-ld.mjs
│  └─ wasm-ld.wasm
│
├─ sysroot/
│  ├─ include/
│  └─ lib/
│     └─ wasm32-wasi/
│
├─ runtime/
│  └─ wasi-shim.js
│
└─ examples/
   ├─ hello.cpp
   └─ vector_sort.cpp
```

---

## 9. manifest.json 최종 규격

```json
{
    "name": "cpp-wasm-toolchain",
    "version": "0.1.0",
    "target": "wasm32-wasi",
    "abi": "wasi-command",
    "compiler": {
        "entry": "compiler/clang.mjs",
        "wasm": "compiler/clang.wasm"
    },
    "linker": {
        "entry": "linker/wasm-ld.mjs",
        "wasm": "linker/wasm-ld.wasm"
    },
    "sysroot": {
        "include": "sysroot/include",
        "lib": "sysroot/lib/wasm32-wasi"
    },
    "runtime": {
        "entry": "runtime/wasi-shim.js"
    },
    "examples": {
        "helloCpp": "examples/hello.cpp",
        "vectorSort": "examples/vector_sort.cpp"
    }
}
```

---

## 10. 버전 정책

Semantic Versioning 사용

```text
MAJOR.MINOR.PATCH
```

예:

- `0.1.0`
- `0.1.1`
- `0.2.0`
- `1.0.0`

정책:

- `PATCH`: 빌드 스크립트 수정, 문서 수정, 릴리스 구조 유지한 채 오류 수정
- `MINOR`: 기능 추가, 예제 추가, 패키지 내부 구성 확장
- `MAJOR`: manifest breaking change, directory layout 변경, runtime API 변경

---

## 11. 빌드 환경

## 11.1 로컬 개발 환경

- macOS
- Xcode Command Line Tools
- Homebrew
- git
- cmake
- ninja
- python3
- node.js
- pnpm 또는 npm
- rust/cargo
- emsdk

권장 초기 설치:

```bash
xcode-select --install
brew install git cmake ninja python node rust pnpm ccache
```

Emscripten은 emsdk로 관리:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

## 11.2 CI 환경

- GitHub Actions
- Ubuntu latest
- reproducible build
- release tagging 기반 배포

---

## 12. 빌드 파이프라인 최종 설계

빌드는 3개 층으로 분리한다.

### 12.1 Sysroot Layer

역할:

- `wasi-sdk`로 sysroot 확보
- headers / libc / libc++ / libc++abi / builtins 확보
- 최종 패키지에 넣을 sysroot 준비

### 12.2 Browser Toolchain Layer

역할:

- `clang` wasm 빌드
- `wasm-ld` wasm 빌드
- 브라우저에서 호출 가능한 entry module 생성

### 12.3 Packaging Layer

역할:

- manifest 생성
- checksums 생성
- dist 디렉토리 생성
- tar.gz artifact 생성
- release upload

---

## 13. Sysroot 구축 명세

## 13.1 기본 전략

v1은 `wasi-sdk` 기반으로 sysroot를 확보한다.

## 13.2 요구 결과물

최종적으로 필요한 sysroot 산출물:

- `include/`
- `lib/wasm32-wasi/`
- builtins 관련 archive

## 13.3 build-sysroot.sh 책임

- `wasi-sdk` 소스 가져오기
- 빌드 또는 공식 구조 기반 sysroot 생성
- 결과물을 `toolchain/workspace/out/sysroot/`에 정리
- 필요한 파일 유무 검증
- 실패 시 즉시 종료

## 13.4 validate-sysroot.sh 검증 대상

최소 검증 항목:

- `include/vector`
- `include/algorithm`
- `include/string`
- `include/map`
- `lib/wasm32-wasi/`
- `libc++.a` 또는 대응 라이브러리
- `libc++abi.a` 또는 대응 라이브러리
- `libclang_rt.builtins-wasm32.a` 또는 대응 builtins

이름은 실제 빌드 결과에 맞춰 구현하되, **존재 검증은 필수**다.

---

## 14. Host LLVM Bootstrap 명세

브라우저용 LLVM 빌드 전, host에서 필요한 bootstrap 도구를 먼저 빌드한다.

## 14.1 목적

- tablegen 계열 도구 확보
- host용 clang/lld 최소 도구 확보
- browser build 입력 준비

## 14.2 build-host-llvm.sh 책임

- llvm-project clone 또는 지정 버전 fetch
- 최소 구성으로 host llvm 빌드
- 불필요한 components 제외
- `toolchain/workspace/out/host-llvm/`에 결과 정리

## 14.3 목표

최소한 아래가 확보되어야 한다.

- llvm-tblgen
- clang-tblgen
- 필요한 경우 host clang
- 필요한 경우 host wasm-ld

---

## 15. Browser LLVM 빌드 명세

이 구간이 가장 핵심이며 가장 불안정할 수 있다.

## 15.1 목표

브라우저에서 실행 가능한:

- `clang.wasm`
- `wasm-ld.wasm`

및 이를 감싸는 JS/MJS entry를 생성한다.

## 15.2 build-browser-llvm.sh 책임

- emsdk 환경 활성화 전제
- browser target build 수행
- 최소 기능 설정
- size-friendly 설정 우선
- 결과물을 `toolchain/workspace/out/browser-toolchain/`에 저장

## 15.3 빌드 원칙

- `MinSizeRel` 우선
- 테스트/예제/벤치마크 제외
- threads 제외
- debug info 제외
- optional feature 최소화
- fail fast

## 15.4 현실적인 주의사항

이 구간은 LLVM upstream, emsdk 버전, patch 여부에 따라 실패 가능성이 있다.
따라서 Claude Code에는 아래를 명시해야 한다.

- 한 번에 완벽 빌드를 노리지 말고 단계적으로 검증
- 먼저 `clang --version` 브라우저 실행
- 그 다음 C hello world compile
- 그 다음 C++ hello
- 그 다음 STL vector/algorithm

즉, **단계별 성공 기준**을 강하게 둬야 한다.

---

## 16. 패키징 명세

## 16.1 package-toolchain.sh 책임

아래를 조립해서 최종 dist를 만든다.

- compiler/
- linker/
- sysroot/
- runtime/
- examples/
- manifest.json
- checksums.txt

## 16.2 출력 위치

```text
dist/cpp-wasm-toolchain/<version>/
```

## 16.3 최종 tarball

```text
dist/cpp-wasm-toolchain-<version>.tar.gz
```

## 16.4 체크 사항

패키징 직후 아래를 검증해야 한다.

- manifest 존재
- clang entry/wasm 존재
- wasm-ld entry/wasm 존재
- sysroot include 존재
- sysroot lib 존재
- runtime entry 존재
- examples 존재

---

## 17. runtime 명세

브라우저에서 최종 wasm program 실행을 돕는 최소 runtime shim을 제공한다.

## 17.1 제공 기능

- stdin 버퍼 제공
- stdout callback
- stderr callback
- argv 전달
- timeout 처리
- 최대 출력 길이 제한
- 종료 상태 전달

## 17.2 비목표

- 고급 FS emulation
- 영속 저장
- 멀티프로세스
- 고급 signal emulation

## 17.3 API 예시

이건 내부 구현용 개념이다.

```ts
type RunOptions = {
    argv?: string[]
    stdin?: string
    timeoutMs?: number
    maxOutputBytes?: number
    onStdout?: (chunk: string) => void
    onStderr?: (chunk: string) => void
}
```

---

## 18. loader 패키지 명세

IDE나 데모에서 패키지를 쉽게 쓰도록 최소 loader를 함께 제공한다.

## 18.1 역할

- manifest fetch
- compiler/linker wasm fetch
- sysroot 위치 resolve
- compile
- link
- execute

## 18.2 비목표

- 상태관리 프레임워크 결합
- UI 컴포넌트 제공
- editor integration

즉 loader는 순수 runtime helper다.

---

## 19. 데모 사이트 명세

## 19.1 목적

- 패키지가 실제 동작하는지 사용자와 개발자가 즉시 확인 가능
- 최소 예제 실행 가능
- GitHub Pages에서 공개

## 19.2 포함 기능

- textarea 하나
- run 버튼
- stdout/stderr 영역
- 예제 불러오기 버튼 1~2개
- 현재 패키지 버전 표시

## 19.3 제외

- Monaco/CodeMirror 같은 무거운 에디터
- 저장 기능
- 다중 파일
- 프로젝트 관리
- 테마 전환

즉 **간단한 설명 + 최소 실행 데모**만 제공한다.

---

## 20. GitHub Pages 배포 명세

Pages에는 다음만 올린다.

- demo 빌드 결과
- 필요 시 동일 버전 manifest URL 참조 정보
- 예제 코드

Pages 배포는 release와 별도로 자동화한다.

---

## 21. CI/CD 명세

## 21.1 Workflow 분리

세 개로 분리하는 것을 권장한다.

### ci.yml

- lint
- script validation
- docs link check
- small local smoke checks

### release.yml

- tag push 시 실행
- sysroot build
- host llvm build
- browser llvm build
- package
- test
- GitHub Release upload

### pages.yml

- main branch 또는 release 시 demo build
- GitHub Pages deploy

---

## 22. Release Workflow 상세

트리거:

```text
tag push: v*
```

예:

```text
v0.1.0
```

순서:

1. checkout
2. setup dependencies
3. restore caches
4. build sysroot
5. validate sysroot
6. build host llvm
7. build browser llvm
8. package toolchain
9. generate manifest
10. generate checksums
11. smoke tests
12. tar.gz 생성
13. GitHub Release 생성
14. asset 업로드
15. release notes 생성

---

## 23. 테스트 명세

## 23.1 smoke test는 필수

최소 아래를 자동화해야 한다.

### hello.c

표준 출력 테스트

### hello.cpp

`iostream` 테스트

### vector_sort.cpp

`vector` + `algorithm` 테스트

### string_map.cpp

`string` + `map` 테스트

### compile_error.cpp

컴파일 오류 정상 노출 테스트

## 23.2 성공 기준

- 컴파일 성공/실패가 정확히 구분될 것
- 성공 케이스는 expected stdout과 일치할 것
- 실패 케이스는 non-empty compile error를 반환할 것

---

## 24. 예제 코드 최종본

### hello.c

```c
#include <stdio.h>

int main(void) {
    printf("hello wasm\n");
    return 0;
}
```

### hello.cpp

```cpp
#include <iostream>

int main() {
    std::cout << "hello wasm" << std::endl;
    return 0;
}
```

### vector_sort.cpp

```cpp
#include <vector>
#include <algorithm>
#include <iostream>

int main() {
    std::vector<int> v = {3, 1, 2};
    std::sort(v.begin(), v.end());

    for (int x : v) {
        std::cout << x << ' ';
    }
    std::cout << std::endl;
    return 0;
}
```

### string_map.cpp

```cpp
#include <iostream>
#include <string>
#include <map>

int main() {
    std::map<std::string, int> m;
    m["alice"] = 3;
    m["bob"] = 5;

    std::cout << m["alice"] << " " << m["bob"] << std::endl;
    return 0;
}
```

### compile_error.cpp

```cpp
#include <iostream>

int main() {
    std::cout << "missing semicolon" << std::endl
    return 0;
}
```

---

## 25. README 최종 구성

README는 아래 순서로 작성한다.

1. 프로젝트 소개
2. 왜 필요한지
3. 지원 범위
4. 빠른 시작
5. 로컬 빌드 방법
6. Release artifact 설명
7. 데모 사이트 링크
8. 아키텍처 개요
9. 한계와 비지원 항목
10. 로드맵
11. 기여 방법

---

## 26. Claude Code에게 넘길 구현 원칙

아래 원칙은 문서에 그대로 넣어도 된다.

### 원칙 1

모든 단계는 **재현 가능**해야 한다.

### 원칙 2

실패 시 조용히 넘어가지 말고 **즉시 실패**해야 한다.

### 원칙 3

경로와 버전은 하드코딩하지 말고 중앙 config로 관리한다.

### 원칙 4

최종 산출물은 항상 **버전 고정 경로**를 사용한다.

### 원칙 5

임시 해법보다 **문서화된 빌드 파이프라인**을 우선한다.

### 원칙 6

v1에서 욕심내지 말고 hello/STL smoke test 성공을 우선한다.

---

# Claude Code에 바로 줄 최종 작업 지시문

아래는 그대로 넘겨도 되는 최종 프롬프트입니다.

```text
Create a public open source repository named cpp-wasm-toolchain.

Goal:
Build, package, version, document, and release a browser-side C/C++ WebAssembly toolchain that can be consumed by a separate web IDE project.

Project constraints:
- This repository is NOT the IDE.
- This repository only builds and distributes the browser toolchain package.
- It must also include a very small public demo site and basic documentation.
- Development environment is macOS.
- CI/CD runs on GitHub Actions.
- Release artifacts must be uploaded to GitHub Releases.
- Demo site must be deployable via GitHub Pages.

Functional requirements:
- Support C and C++.
- Student programs must target wasm32-wasi.
- Runtime model for v1 must be WASI command mode (_start entry).
- C++ STL support is required for at least:
  - iostream
  - vector
  - algorithm
  - string
  - map
  - set
  - queue
  - stack
- Use wasi-sdk as the sysroot/runtime library source for v1.
- Build browser-usable clang and wasm-ld WebAssembly modules.
- Package the result into a versioned release artifact.

Out of scope for v1:
- pthread
- exceptions
- dynamic linking
- filesystem
- Boost
- threads
- source maps
- LTO
- advanced debugging

Repository deliverables:
1. Full repository structure.
2. Build scripts for:
   - sysroot
   - host LLVM bootstrap
   - browser LLVM build
   - packaging
3. Validation scripts for required sysroot/runtime files.
4. manifest.json generator.
5. checksum generator.
6. Release packaging script that creates:
   dist/cpp-wasm-toolchain-<version>.tar.gz
7. GitHub Actions workflows:
   - ci.yml
   - release.yml
   - pages.yml
8. Simple GitHub Pages demo site:
   - textarea
   - run button
   - stdout/stderr output
   - sample C++ STL example
9. Smoke tests for:
   - hello.c
   - hello.cpp
   - vector + algorithm
   - string + map
   - compile error case
10. Documentation:
   - architecture
   - local build
   - release process
   - demo usage
   - roadmap

Implementation rules:
- Prefer reproducibility over shortcuts.
- Use MinSizeRel where applicable for browser-side compiler builds.
- Use centralized version/config files.
- Fail fast on missing expected artifacts.
- Validate presence of libc++, libc++abi, builtins, and sysroot include files before packaging.
- Keep packaging layout stable and versioned.
- Keep the demo intentionally simple.
- Do not build the IDE itself.
- Assume future consumers will fetch the release artifact and use it from another project.

Expected artifact layout:
cpp-wasm-toolchain/
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
  runtime/
    wasi-shim.js
  examples/
    hello.cpp
    vector_sort.cpp

Milestone order:
- M1: repo skeleton + docs + scripts scaffold
- M2: sysroot build and validation
- M3: host LLVM bootstrap
- M4: browser clang/wasm-ld build attempt and artifact generation
- M5: local smoke tests
- M6: package + manifest + checksums
- M7: GitHub Release CI
- M8: GitHub Pages demo
- M9: polish documentation and roadmap

Important:
This project is difficult. Do not pretend the browser-side clang/lld build is trivial.
Implement incrementally with clear checkpoints and keep all failure points explicit.
```

---

# 마일스톤 최종 정리

아래는 차후 계획까지 포함한 **현실적인 마일스톤**입니다.

## Milestone 1 — Repository Foundation

목표:

- 저장소 구조 생성
- 문서 초안
- 기본 스크립트 뼈대
- demo skeleton
- workflow skeleton

완료 기준:

- 저장소 클론 후 구조가 이해 가능
- README, architecture 문서 존재
- build scripts placeholder 존재

---

## Milestone 2 — Sysroot Build

목표:

- `wasi-sdk` 기반 sysroot 확보
- validation script 작성
- include/lib 구조 정리

완료 기준:

- `sysroot/include`
- `sysroot/lib/wasm32-wasi`
- STL 관련 헤더 확인 가능
- validation script 통과

리스크:

- wasi-sdk 버전 변화
- 라이브러리 파일명 차이

---

## Milestone 3 — Host LLVM Bootstrap

목표:

- host bootstrap 도구 확보
- build-host-llvm.sh 작성

완료 기준:

- host build 성공
- tblgen 관련 도구 확보
- 브라우저 빌드 전 단계로 사용 가능

리스크:

- macOS toolchain 차이
- llvm version mismatch

---

## Milestone 4 — Browser Compiler/Linker Build

목표:

- browser-usable clang/wasm-ld 산출
- 최소 entry module 확보

완료 기준:

- `clang.mjs + clang.wasm`
- `wasm-ld.mjs + wasm-ld.wasm`
- 최소 브라우저 로딩 확인

리스크:

- 가장 큼
- emsdk/llvm 조합 문제
- 패치 필요 가능성 높음

---

## Milestone 5 — Local Smoke Execution

목표:

- hello.c
- hello.cpp
- STL 예제
- compile error

완료 기준:

- expected stdout 반환
- compile error 표시 성공

리스크:

- runtime shim 문제
- sysroot linking 문제

---

## Milestone 6 — Packaging and Versioning

목표:

- dist 구조 완성
- manifest/checksum 자동 생성
- tarball 출력

완료 기준:

- `dist/cpp-wasm-toolchain-<version>.tar.gz`
- 내부 구조 규격 일치
- checksums 생성

---

## Milestone 7 — GitHub Release Automation

목표:

- tag push로 release artifact 생성
- asset 업로드 자동화

완료 기준:

- `v0.1.0` 태그로 release 생성
- artifact 업로드 성공
- release notes 생성

---

## Milestone 8 — GitHub Pages Demo

목표:

- 최소 데모 공개
- sample C++ STL 실행 가능

완료 기준:

- GitHub Pages에서 동작
- 예제 코드 실행 가능
- 버전 표시

---

## Milestone 9 — Documentation Polish

목표:

- 외부 사용자가 이해 가능한 문서 정리
- 아키텍처, 빌드, 릴리스, 데모 문서 완성

완료 기준:

- 처음 보는 개발자도 저장소 목적 이해 가능
- 빌드 절차 문서화 완료
- known limitations 명시

---

## Milestone 10 — Post-v1 Optimization

목표:

- artifact 크기 줄이기
- first-load 시간 개선
- sysroot 패키징 최적화
- 브라우저 캐시 친화 구조

완료 기준:

- v1 대비 크기 감소
- 빌드 및 문서 유지

---

# v1 이후 로드맵

## v1.1

- artifact size reduction
- better smoke tests
- improved release notes
- stronger sysroot validation

## v1.2

- optional cache-friendly split packaging
- loader API 안정화
- worker demo 개선

## v1.3

- compile options preset
- timeout/output limit defaults 강화
- example set 확대

## v2.0 후보

- reactor mode 검토
- custom exported function model
- 예외 지원 검토
- 고급 runtime abstraction

단, 이건 v1 성공 이후다.

---

# 최종 결론

이 프로젝트의 최종 방향은 아래 한 줄로 정리할 수 있습니다.

**“브라우저에서 C/C++를 컴파일하고 실행할 수 있는 독립형 wasm 툴체인을 오픈소스로 만들고, GitHub Releases와 GitHub Pages를 통해 버전 고정 패키지와 데모를 공개 배포한다.”**

그리고 v1의 핵심은 이것입니다.

- `wasm32-wasi`
- `WASI command mode`
- `wasi-sdk sysroot`
- `clang.wasm`
- `wasm-ld.wasm`
- `GitHub Release artifact`
- `simple GitHub Pages demo`
