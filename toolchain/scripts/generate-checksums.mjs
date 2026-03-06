#!/usr/bin/env node
/**
 * generate-checksums.mjs
 *
 * Walks all files under dist/cpp-wasm-toolchain/<version>/, computes SHA-256
 * checksums, and writes checksums.txt (sorted deterministically).
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')

// ── Version resolution (shared pattern with generate-manifest.mjs) ────────────

function readVersionsEnv() {
  const envPath = resolve(REPO_ROOT, 'toolchain/config/versions.env')
  if (!existsSync(envPath)) return {}
  const result = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) result[m[1]] = m[2].trim()
  }
  return result
}

const env = readVersionsEnv()
const version = process.env.TOOLCHAIN_VERSION ?? env.TOOLCHAIN_VERSION
if (!version) {
  console.error('[checksums] ERROR: TOOLCHAIN_VERSION not set and not found in versions.env')
  process.exit(1)
}

const PKG_DIR = resolve(REPO_ROOT, `dist/cpp-wasm-toolchain/${version}`)

if (!existsSync(PKG_DIR)) {
  console.error(`[checksums] ERROR: dist directory not found: ${PKG_DIR}`)
  process.exit(1)
}

// ── File walker ───────────────────────────────────────────────────────────────

function walkFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

// ── Generate checksums ────────────────────────────────────────────────────────

const allFiles = walkFiles(PKG_DIR)
  .map(abs => relative(PKG_DIR, abs))
  .filter(rel => rel !== 'checksums.txt')
  .sort()

const lines = allFiles.map(rel => `${sha256(join(PKG_DIR, rel))}  ${rel}`)

const outPath = resolve(PKG_DIR, 'checksums.txt')
writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`[checksums] wrote ${outPath} (${allFiles.length} files)`)
