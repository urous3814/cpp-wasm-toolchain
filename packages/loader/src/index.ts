import { runWasi, WasiRunOptions } from '@cpp-wasm-toolchain/runtime'

export interface ToolchainManifest {
    name: string
    version: string
    target: string
    compiler: { entry: string; wasm: string }
    linker: { entry: string; wasm: string }
    runtime: { entry: string }
    sysroot: { include: string; lib: string }
}

export interface CompileOptions {
    source: string
    filename?: string
    flags?: string[]
    stdin?: string
    stdout?: (s: string) => void
    stderr?: (s: string) => void
    timeoutMs?: number
}

export class Toolchain {
    private baseUrl: string
    private manifest: ToolchainManifest | null = null
    private clangModule: WebAssembly.Module | null = null
    private wasmLdModule: WebAssembly.Module | null = null

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '')
    }

    async loadManifest(): Promise<ToolchainManifest> {
        if (this.manifest) return this.manifest
        const res = await fetch(`${this.baseUrl}/manifest.json`)
        if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`)
        this.manifest = await res.json()
        return this.manifest!
    }

    async loadCompiler(): Promise<WebAssembly.Module> {
        if (this.clangModule) return this.clangModule
        const manifest = await this.loadManifest()
        const url = `${this.baseUrl}/${manifest.compiler.wasm}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch clang.wasm: ${res.status}`)
        this.clangModule = await WebAssembly.compileStreaming(res)
        return this.clangModule
    }

    async loadLinker(): Promise<WebAssembly.Module> {
        if (this.wasmLdModule) return this.wasmLdModule
        const manifest = await this.loadManifest()
        const url = `${this.baseUrl}/${manifest.linker.wasm}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch wasm-ld.wasm: ${res.status}`)
        this.wasmLdModule = await WebAssembly.compileStreaming(res)
        return this.wasmLdModule
    }

    async compile(opts: CompileOptions): Promise<{ ok: boolean; diagnostics: string }> {
        const clang = await this.loadCompiler()
        const diagnostics: string[] = []
        const wasiOpts: WasiRunOptions = {
            stderr: (s) => diagnostics.push(s),
            timeoutMs: opts.timeoutMs ?? 30_000,
        }
        try {
            await runWasi(clang, wasiOpts)
            return { ok: true, diagnostics: diagnostics.join('') }
        } catch (e) {
            return { ok: false, diagnostics: diagnostics.join('') }
        }
    }

    async run(wasmModule: WebAssembly.Module, opts: WasiRunOptions = {}): Promise<void> {
        await runWasi(wasmModule, opts)
    }
}

export { runWasi } from '@cpp-wasm-toolchain/runtime'
