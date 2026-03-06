import { loadManifest, resolveToolchain, LoadedToolchain } from '@cpp-wasm-toolchain/loader'
import { runWasiProgram } from '@cpp-wasm-toolchain/runtime'

export type WorkerRequest =
    | { type: 'compile'; source: string; filename: string; flags?: string[]; baseUrl?: string }
    | { type: 'run'; wasmBytes: ArrayBuffer; stdin?: string; baseUrl?: string }

export type WorkerResponse =
    | { type: 'ready' }
    | { type: 'compile:ok'; diagnostics: string }
    | { type: 'compile:error'; diagnostics: string }
    | { type: 'run:stdout'; text: string }
    | { type: 'run:stderr'; text: string }
    | { type: 'run:done'; exitCode: number; timedOut: boolean }
    | { type: 'error'; message: string }

declare const self: Worker

let toolchain: LoadedToolchain | null = null

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
    const req = event.data

    try {
        // Lazily load the toolchain manifest on first message that provides baseUrl.
        if (!toolchain && req.baseUrl) {
            const manifestUrl = req.baseUrl.replace(/\/$/, '') + '/manifest.json'
            const manifest = await loadManifest(manifestUrl)
            toolchain = resolveToolchain(manifestUrl, manifest)
        }

        if (req.type === 'compile') {
            // Full compilation is not yet implemented; placeholder response.
            self.postMessage({ type: 'compile:error', diagnostics: '[worker] compile not yet implemented' } satisfies WorkerResponse)

        } else if (req.type === 'run') {
            const mod = await WebAssembly.compile(req.wasmBytes)
            const result = await runWasiProgram({
                wasmModule: mod,
                stdin: req.stdin,
                onStdout: (text: string) => self.postMessage({ type: 'run:stdout', text } satisfies WorkerResponse),
                onStderr: (text: string) => self.postMessage({ type: 'run:stderr', text } satisfies WorkerResponse),
            })
            self.postMessage({ type: 'run:done', exitCode: result.exitCode, timedOut: result.timedOut } satisfies WorkerResponse)
        }
    } catch (e) {
        self.postMessage({ type: 'error', message: String(e) } satisfies WorkerResponse)
    }
})

self.postMessage({ type: 'ready' } satisfies WorkerResponse)
