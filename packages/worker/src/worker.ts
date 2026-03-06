/**
 * worker.ts
 *
 * Toolchain Web Worker entry point.
 * Handles the message protocol defined in messages.ts.
 */

import { loadManifest, resolveToolchain, LoadedToolchain } from '@cpp-wasm-toolchain/loader'
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

// TODO(compile): instantiate clang.wasm, pipe source through compiler,
//               run wasm-ld, return linked binary.
async function handleCompile(_req: CompileRequest): Promise<void> {
  send({ type: 'compile:error', diagnostics: '[worker] compile not yet implemented' })
}

// TODO(run): instantiate the provided wasm binary via runWasiProgram,
//            stream stdout/stderr, return run:done.
async function handleRun(_req: RunRequest): Promise<void> {
  send({ type: 'run:done', exitCode: 1, timedOut: false, durationMs: 0 })
  send({ type: 'error', message: '[worker] run not yet implemented' })
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
