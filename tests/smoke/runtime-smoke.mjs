/**
 * runtime-smoke.mjs
 *
 * Validates the WASI runtime shim at a structural level:
 * - source file exists and is non-empty
 * - expected export names are present in the source
 * - compiled dist file validates the same exports when available
 *
 * Future: will import and invoke runWasiProgram with a minimal .wasm binary.
 */

import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

const RUNTIME_SRC = resolve(REPO_ROOT, 'packages/runtime/src/wasi-shim.ts')
const RUNTIME_DIST = resolve(REPO_ROOT, 'packages/runtime/dist/wasi-shim.js')

let failed = false

function pass(msg) { console.log(`  [ok] ${msg}`) }
function fail(msg) { console.error(`  [fail] ${msg}`); failed = true }

// ── Required exports defined in the runtime source ────────────────────────────

const EXPECTED_EXPORTS = [
  'RunOptions',
  'RunResult',
  'runWasiProgram',
]

// ── Step 1: source file ───────────────────────────────────────────────────────

console.log('[runtime-smoke] checking source file')

if (!existsSync(RUNTIME_SRC)) {
  fail(`source missing: ${RUNTIME_SRC}`)
} else {
  const size = statSync(RUNTIME_SRC).size
  if (size === 0) {
    fail('source file is empty')
  } else {
    pass(`wasi-shim.ts (${size} bytes)`)
    const src = readFileSync(RUNTIME_SRC, 'utf8')

    for (const name of EXPECTED_EXPORTS) {
      if (src.includes(name)) {
        pass(`export found: ${name}`)
      } else {
        fail(`export missing in source: ${name}`)
      }
    }
  }
}

// ── Step 2: compiled dist (optional) ─────────────────────────────────────────

console.log('[runtime-smoke] checking compiled dist')

if (!existsSync(RUNTIME_DIST)) {
  console.log('  [skip] dist/wasi-shim.js not found (run build first)')
} else {
  const size = statSync(RUNTIME_DIST).size
  if (size === 0) {
    fail('dist/wasi-shim.js is empty')
  } else {
    pass(`wasi-shim.js (${size} bytes)`)
    const dist = readFileSync(RUNTIME_DIST, 'utf8')
    for (const name of ['runWasiProgram']) {
      if (dist.includes(name)) {
        pass(`dist export found: ${name}`)
      } else {
        fail(`dist export missing: ${name}`)
      }
    }
  }
}

// ── Future extension points ───────────────────────────────────────────────────
// TODO: import runWasiProgram from compiled dist and execute a minimal wasm binary
// TODO: validate RunResult fields (ok, exitCode, stdout, stderr, timedOut, durationMs)

// ── Result ────────────────────────────────────────────────────────────────────

if (failed) {
  console.error('[runtime-smoke] FAILED')
  process.exit(1)
}
console.log('[runtime-smoke] passed')
