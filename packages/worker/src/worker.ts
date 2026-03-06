import { Toolchain } from '@cpp-wasm-toolchain/loader'

export type WorkerRequest =
    | { type: 'compile'; source: string; filename: string; flags?: string[] }
    | { type: 'run'; wasmBytes: Uint8Array; stdin?: string }

export type WorkerResponse =
    | { type: 'ready' }
    | { type: 'compile:ok'; diagnostics: string }
    | { type: 'compile:error'; diagnostics: string }
    | { type: 'run:stdout'; text: string }
    | { type: 'run:stderr'; text: string }
    | { type: 'run:done' }
    | { type: 'error'; message: string }

declare const self: Worker

let toolchain: Toolchain | null = null

self.addEventListener('message', async (event: MessageEvent<WorkerRequest & { baseUrl?: string }>) => {
    const req = event.data

    try {
        if (!toolchain) {
            if (!req.baseUrl) throw new Error('baseUrl required for first message')
            toolchain = new Toolchain(req.baseUrl)
        }

        if (req.type === 'compile') {
            const result = await toolchain.compile({
                source: req.source,
                filename: req.filename,
                flags: req.flags,
            })
            self.postMessage(result.ok
                ? { type: 'compile:ok', diagnostics: result.diagnostics }
                : { type: 'compile:error', diagnostics: result.diagnostics }
            )
        } else if (req.type === 'run') {
            const mod = await WebAssembly.compile(req.wasmBytes)
            await toolchain.run(mod, {
                stdin: req.stdin,
                stdout: (text) => self.postMessage({ type: 'run:stdout', text }),
                stderr: (text) => self.postMessage({ type: 'run:stderr', text }),
            })
            self.postMessage({ type: 'run:done' })
        }
    } catch (e) {
        self.postMessage({ type: 'error', message: String(e) })
    }
})

self.postMessage({ type: 'ready' })
