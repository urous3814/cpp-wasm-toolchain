/**
 * compiler.ts
 *
 * Browser-side C++ compilation pipeline using emscripten-compiled clang.mjs
 * and wasm-ld.mjs. Fetches the sysroot tarball once, writes headers and libs
 * into each emscripten virtual FS, then drives clang → wasm-ld.
 */

import type { LoadedToolchain } from '@cpp-wasm-toolchain/loader'

// ── Emscripten module types ───────────────────────────────────────────────────

interface EmscriptenFS {
  mkdir(path: string): void
  writeFile(path: string, data: Uint8Array | string): void
  readFile(path: string, opts: { encoding: 'binary' }): Uint8Array
  unlink(path: string): void
}

interface EmscriptenModule {
  FS: EmscriptenFS
  callMain(args: string[]): number
  printErr: (s: string) => void
  print: (s: string) => void
}

type EmscriptenFactory = (config: {
  noInitialRun?: boolean
  locateFile?: (f: string, prefix: string) => string
  printErr?: (s: string) => void
  print?: (s: string) => void
}) => Promise<EmscriptenModule>

// ── Tar.gz unpacker ──────────────────────────────────────────────────────────

async function unpackTarGz(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(new Uint8Array(buffer))
  writer.close()

  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  let total = 0
  for (const c of chunks) total += c.length
  const tar = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { tar.set(c, off); off += c.length }

  const files = new Map<string, Uint8Array>()
  const dec = new TextDecoder()
  let pos = 0

  while (pos + 512 <= tar.length) {
    const header = tar.subarray(pos, pos + 512)
    if (header.every(b => b === 0)) break

    const nameRaw = header.subarray(0, 100)
    const nameEnd = nameRaw.indexOf(0)
    const name = dec.decode(nameRaw.subarray(0, nameEnd >= 0 ? nameEnd : 100))

    // GNU tar prefix extension (bytes 345-499)
    const prefixRaw = header.subarray(345, 500)
    const prefixEnd = prefixRaw.indexOf(0)
    const prefix = dec.decode(prefixRaw.subarray(0, prefixEnd >= 0 ? prefixEnd : 155)).trim()
    const fullName = prefix ? `${prefix}/${name}` : name

    const sizeStr = dec.decode(header.subarray(124, 136)).trim().replace(/\0/g, '')
    const size = parseInt(sizeStr, 8) || 0
    const typeflag = String.fromCharCode(header[156])

    pos += 512

    if ((typeflag === '0' || typeflag === '' || typeflag === '\0') && size > 0 && fullName) {
      files.set(fullName, tar.slice(pos, pos + size))
    }
    pos += Math.ceil(size / 512) * 512
  }

  return files
}

function writeFilesToFS(
  fs: EmscriptenFS,
  files: Map<string, Uint8Array>,
  mountAt: string,
): void {
  const created = new Set<string>()

  function ensureDir(d: string): void {
    if (!d || d === '/' || created.has(d)) return
    const parent = d.slice(0, d.lastIndexOf('/')) || '/'
    ensureDir(parent)
    try { fs.mkdir(d) } catch { /* already exists */ }
    created.add(d)
  }

  for (const [tarPath, data] of files) {
    if (!tarPath || tarPath.endsWith('/')) continue
    const fullPath = mountAt.replace(/\/$/, '') + '/' + tarPath.replace(/^\.\//, '')
    const dir = fullPath.slice(0, fullPath.lastIndexOf('/'))
    ensureDir(dir)
    fs.writeFile(fullPath, data)
  }
}

// ── Sysroot cache ─────────────────────────────────────────────────────────────

let cachedSysrootFiles: Map<string, Uint8Array> | null = null

async function getSysrootFiles(baseUrl: string): Promise<Map<string, Uint8Array>> {
  if (cachedSysrootFiles) return cachedSysrootFiles
  const url = baseUrl.replace(/\/$/, '') + '/sysroot/sysroot.tar.gz'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`[compiler] sysroot fetch failed (${res.status}): ${url}`)
  const buf = await res.arrayBuffer()
  cachedSysrootFiles = await unpackTarGz(buf)
  return cachedSysrootFiles
}

async function populateSysrootFS(
  fs: EmscriptenFS,
  baseUrl: string,
): Promise<void> {
  const files = await getSysrootFiles(baseUrl)
  try { fs.mkdir('/sysroot') } catch { /* exists */ }
  try { fs.mkdir('/src') } catch { /* exists */ }
  try { fs.mkdir('/tmp') } catch { /* exists */ }
  writeFilesToFS(fs, files, '/sysroot')
}

// ── Module loaders ────────────────────────────────────────────────────────────

let clangMod: EmscriptenModule | null = null
let lldMod: EmscriptenModule | null = null

async function loadClangModule(toolchain: LoadedToolchain): Promise<EmscriptenModule> {
  if (clangMod) return clangMod
  // Dynamic import of the emscripten ES module factory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import(toolchain.compilerEntryUrl) as any
  const factory: EmscriptenFactory = mod.default ?? mod
  clangMod = await factory({
    noInitialRun: true,
    locateFile: (f: string) => f === 'clang.wasm' ? toolchain.compilerWasmUrl : f,
  })
  await populateSysrootFS(clangMod.FS, toolchain.baseUrl)
  return clangMod
}

async function loadLldModule(toolchain: LoadedToolchain): Promise<EmscriptenModule> {
  if (lldMod) return lldMod
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import(toolchain.linkerEntryUrl) as any
  const factory: EmscriptenFactory = mod.default ?? mod
  lldMod = await factory({
    noInitialRun: true,
    locateFile: (f: string) => f === 'wasm-ld.wasm' ? toolchain.linkerWasmUrl : f,
  })
  await populateSysrootFS(lldMod.FS, toolchain.baseUrl)
  return lldMod
}

// ── Public result types ───────────────────────────────────────────────────────

export type CompileResult =
  | { ok: true;  objectBytes: Uint8Array; diagnostics: string }
  | { ok: false; diagnostics: string }

export type LinkResult =
  | { ok: true;  wasmBytes: Uint8Array; diagnostics: string }
  | { ok: false; diagnostics: string }

// ── Compile (source → object file) ───────────────────────────────────────────

export async function compileCpp(
  toolchain: LoadedToolchain,
  source: string,
  filename: string,
  extraFlags: string[] = [],
): Promise<CompileResult> {
  const mod = await loadClangModule(toolchain)

  const srcPath = `/src/${filename}`
  const objPath = `/tmp/${filename}.o`
  mod.FS.writeFile(srcPath, source)

  let diag = ''
  const prevErr = mod.printErr
  const prevOut = mod.print
  mod.printErr = (s: string) => { diag += s + '\n' }
  mod.print    = (s: string) => { diag += s + '\n' }

  let exitCode: number
  try {
    exitCode = mod.callMain([
      '--target=wasm32-wasi',
      '--sysroot=/sysroot',
      '-isystem', '/sysroot/include/wasm32-wasi',
      '-isystem', '/sysroot/include/wasm32-wasi/c++/v1',
      '-c',
      '-O1',
      '-o', objPath,
      srcPath,
      ...extraFlags,
    ])
  } finally {
    mod.printErr = prevErr
    mod.print    = prevOut
  }

  try { mod.FS.unlink(srcPath) } catch { /* ignore */ }

  if (exitCode !== 0) {
    return { ok: false, diagnostics: diag || `clang exited with code ${exitCode}` }
  }

  const objectBytes = mod.FS.readFile(objPath, { encoding: 'binary' })
  try { mod.FS.unlink(objPath) } catch { /* ignore */ }
  return { ok: true, objectBytes, diagnostics: diag }
}

// ── Link (object → wasm binary) ───────────────────────────────────────────────

export async function linkWasm(
  toolchain: LoadedToolchain,
  objectBytes: Uint8Array,
): Promise<LinkResult> {
  const mod = await loadLldModule(toolchain)

  const objPath = '/tmp/input.o'
  const outPath = '/tmp/out.wasm'
  mod.FS.writeFile(objPath, objectBytes)

  let diag = ''
  const prevErr = mod.printErr
  const prevOut = mod.print
  mod.printErr = (s: string) => { diag += s + '\n' }
  mod.print    = (s: string) => { diag += s + '\n' }

  let exitCode: number
  try {
    exitCode = mod.callMain([
      '-flavor', 'wasm',
      '--target=wasm32-wasi',
      objPath,
      '-L/sysroot/lib/wasm32-wasi',
      '-lc',
      '-lc++',
      '-lc++abi',
      '--export=_start',
      '--allow-undefined',
      '-o', outPath,
    ])
  } finally {
    mod.printErr = prevErr
    mod.print    = prevOut
  }

  try { mod.FS.unlink(objPath) } catch { /* ignore */ }

  if (exitCode !== 0) {
    return { ok: false, diagnostics: diag || `wasm-ld exited with code ${exitCode}` }
  }

  const wasmBytes = mod.FS.readFile(outPath, { encoding: 'binary' })
  try { mod.FS.unlink(outPath) } catch { /* ignore */ }
  return { ok: true, wasmBytes, diagnostics: diag }
}
