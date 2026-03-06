#!/usr/bin/env node
/**
 * generate-manifest.mjs
 *
 * Generates dist/cpp-wasm-toolchain/<version>/manifest.json for a packaged
 * release. Validates that all expected artifacts exist before writing.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

// ── Version resolution ────────────────────────────────────────────────────────

function readVersionsEnv() {
  const envPath = resolve(REPO_ROOT, 'toolchain/config/versions.env')
  if (!existsSync(envPath)) return {}
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const result = {}
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) result[m[1]] = m[2].trim()
  }
  return result
}

const env = readVersionsEnv()
const version = process.env.TOOLCHAIN_VERSION ?? env.TOOLCHAIN_VERSION
if (!version) {
  console.error('[manifest] ERROR: TOOLCHAIN_VERSION not set and not found in versions.env')
  process.exit(1)
}

// ── Paths ─────────────────────────────────────────────────────────────────────

const PKG_DIR = resolve(REPO_ROOT, `dist/cpp-wasm-toolchain/${version}`)

// ── Artifact validation ───────────────────────────────────────────────────────

function requireFile(rel) {
  const abs = resolve(PKG_DIR, rel)
  if (!existsSync(abs)) {
    console.error(`[manifest] ERROR: missing required file: ${abs}`)
    return false
  }
  return true
}

function requireDir(rel) {
  const abs = resolve(PKG_DIR, rel)
  if (!existsSync(abs)) {
    console.error(`[manifest] ERROR: missing required directory: ${abs}`)
    return false
  }
  return true
}

let valid = true
valid = requireFile('compiler/clang.wasm') && valid
valid = requireFile('linker/wasm-ld.wasm') && valid
valid = requireFile('runtime/wasi-shim.js') && valid
valid = requireDir('sysroot/include') && valid
valid = requireDir('sysroot/lib/wasm32-wasi') && valid

if (!valid) {
  console.error('[manifest] ERROR: one or more required artifacts are missing; aborting')
  process.exit(1)
}

// ── Manifest object ───────────────────────────────────────────────────────────

const manifest = {
  name: 'cpp-wasm-toolchain',
  version,
  target: 'wasm32-wasi',
  abi: 'wasi-preview1',
  compiler: {
    entry: 'compiler/clang.mjs',
    wasm: 'compiler/clang.wasm',
  },
  linker: {
    entry: 'linker/wasm-ld.mjs',
    wasm: 'linker/wasm-ld.wasm',
  },
  sysroot: {
    include: 'sysroot/include',
    lib: 'sysroot/lib/wasm32-wasi',
  },
  runtime: {
    entry: 'runtime/wasi-shim.js',
  },
}

// ── Write ─────────────────────────────────────────────────────────────────────

const outPath = resolve(PKG_DIR, 'manifest.json')
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`[manifest] wrote ${outPath}`)
