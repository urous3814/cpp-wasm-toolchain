/**
 * worker.ts
 *
 * Toolchain Web Worker entry point.
 * Handles the message protocol defined in messages.ts.
 */

import { loadManifest, resolveToolchain, LoadedToolchain } from '@cpp-wasm-toolchain/loader'
import { runWasiProgram } from '@cpp-wasm-toolchain/runtime'
import { compileCpp, linkWasm } from './compiler'
import type {
  WorkerRequest,
  WorkerResponse,
  InitRequest,
  CompileRequest,
  RunRequest,
} from './messages'

export type { WorkerRequest, WorkerResponse } from './messages'

declare const self: Worker

// Worker-side state
let toolchain: LoadedToolchain | null = null

function send(msg: WorkerResponse): void {
  self.postMessage(msg)
}

// ── Request handlers ──────────────────────────────────────────────────────────

async function handleInit(req: InitRequest): Promise<void> {
  const manifestUrl = req.baseUrl.replace(/\/$/, '') + '/manifest.json'
  const manifest = await loadManifest(manifestUrl)
  toolchain = resolveToolchain(manifestUrl, manifest)
  send({ type: 'init:ok', version: toolchain.manifest.version })
}

async function handleCompile(req: CompileRequest): Promise<void> {
  const tc = toolchain!

  const compileResult = await compileCpp(
    tc,
    req.source,
    req.filename,
    req.flags ?? [],
  )

  if (!compileResult.ok) {
    send({ type: 'compile:error', diagnostics: compileResult.diagnostics })
    return
  }

  const linkResult = await linkWasm(tc, compileResult.objectBytes)

  if (!linkResult.ok) {
    const diag = [compileResult.diagnostics, linkResult.diagnostics].filter(Boolean).join('\n')
    send({ type: 'compile:error', diagnostics: diag })
    return
  }

  const combinedDiag = [compileResult.diagnostics, linkResult.diagnostics].filter(Boolean).join('\n')
  send({
    type: 'compile:ok',
    wasmBytes: linkResult.wasmBytes.buffer as ArrayBuffer,
    diagnostics: combinedDiag,
  })
}

async function handleRun(req: RunRequest): Promise<void> {
  const t0 = Date.now()

  const result = await runWasiProgram({
    wasmModule: req.wasmBytes,
    stdin: req.stdin ?? '',
    timeoutMs: req.timeoutMs ?? 10_000,
    onStdout: (chunk) => send({ type: 'run:stdout', text: chunk }),
    onStderr: (chunk) => send({ type: 'run:stderr', text: chunk }),
  })

  send({
    type: 'run:done',
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    durationMs: Date.now() - t0,
  })
}

// ── Message dispatcher ────────────────────────────────────────────────────────

// Notify the main thread that the worker script has loaded.
send({ type: 'ready' } satisfies WorkerResponse)

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data
  try {
    switch (req.type) {
      case 'ping':
        send({ type: 'pong' })
        break

      case 'init':
        await handleInit(req)
        break

      case 'compile':
        if (!toolchain) throw new Error('Worker not initialized. Send init first.')
        await handleCompile(req)
        break

      case 'run':
        if (!toolchain) throw new Error('Worker not initialized. Send init first.')
        await handleRun(req)
        break

      default: {
        const exhaustive: never = req
        send({ type: 'error', message: `Unknown request type: ${(exhaustive as WorkerRequest).type}` })
      }
    }
  } catch (e) {
    send({ type: 'error', message: String(e) })
  }
})
