import { existsSync, statSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// ── Paths ──────────────────────────────────────────────────────────────────

export const PATHS = {
  toolchain: resolve(REPO_ROOT, 'toolchain/workspace/out/browser-toolchain'),
  sysroot:   resolve(REPO_ROOT, 'toolchain/workspace/out/sysroot'),
  examples:  resolve(REPO_ROOT, 'examples'),
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function checkFile(filePath) {
  if (!existsSync(filePath)) {
    return { ok: false, reason: 'missing' };
  }
  const size = statSync(filePath).size;
  if (size === 0) {
    return { ok: false, reason: 'empty' };
  }
  return { ok: true, size };
}

export function checkDir(dirPath) {
  if (!existsSync(dirPath)) {
    return { ok: false, reason: 'missing' };
  }
  return { ok: true };
}

export function loadExample(name) {
  const filePath = resolve(PATHS.examples, name);
  const result = checkFile(filePath);
  if (!result.ok) return { ok: false, name, reason: result.reason };
  const source = readFileSync(filePath, 'utf8');
  return { ok: true, name, source, size: result.size };
}

// ── Validation steps ───────────────────────────────────────────────────────

function validateCompilerArtifacts() {
  console.log('[smoke] checking compiler artifacts');
  let passed = true;
  for (const artifact of ['clang.wasm', 'wasm-ld.wasm']) {
    const result = checkFile(resolve(PATHS.toolchain, artifact));
    if (result.ok) {
      console.log(`  [ok] ${artifact} (${result.size} bytes)`);
    } else {
      console.error(`  [fail] ${artifact}: ${result.reason}`);
      passed = false;
    }
  }
  return passed;
}

function validateSysroot() {
  console.log('[smoke] checking sysroot');
  let passed = true;
  for (const sub of ['include', 'lib/wasm32-wasi']) {
    const result = checkDir(resolve(PATHS.sysroot, sub));
    if (result.ok) {
      console.log(`  [ok] sysroot/${sub}`);
    } else {
      console.error(`  [fail] sysroot/${sub}: ${result.reason}`);
      passed = false;
    }
  }
  return passed;
}

function validateExamples() {
  console.log('[smoke] checking examples');
  let passed = true;
  for (const name of ['hello.c', 'hello.cpp', 'vector_sort.cpp']) {
    const result = loadExample(name);
    if (result.ok) {
      console.log(`  [ok] ${name} (${result.size} bytes)`);
    } else {
      console.error(`  [fail] ${name}: ${result.reason}`);
      passed = false;
    }
  }
  return passed;
}

// ── Future extension points ────────────────────────────────────────────────
// async function loadCompiler() { /* TODO: import clang loader module */ }
// async function compileSource(source, filename) { /* TODO: invoke clang.wasm */ }
// async function testHelloC() { /* TODO: compile + run hello.c */ }
// async function testHelloCpp() { /* TODO: compile + run hello.cpp */ }
// async function testStlExample() { /* TODO: compile + run vector_sort.cpp */ }

// ── Main ───────────────────────────────────────────────────────────────────

const results = [
  validateCompilerArtifacts(),
  validateSysroot(),
  validateExamples(),
];

if (results.every(Boolean)) {
  console.log('[smoke] artifact smoke test passed');
} else {
  console.error('[smoke] artifact smoke test FAILED');
  process.exit(1);
}
