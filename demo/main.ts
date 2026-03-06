import { loadManifest, resolveToolchain } from '../packages/loader/src/index'

// In production, set via bundler (e.g. Vite: VITE_TOOLCHAIN_BASE_URL).
const TOOLCHAIN_BASE_URL: string =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TOOLCHAIN_BASE_URL
        ?? '/dist/cpp-wasm-toolchain/0.1.0'

const codeEl = document.getElementById('code') as HTMLTextAreaElement
const outputEl = document.getElementById('output') as HTMLPreElement
const statusEl = document.getElementById('status') as HTMLSpanElement
const runBtn = document.getElementById('run') as HTMLButtonElement

async function run() {
    outputEl.textContent = ''
    statusEl.textContent = 'Loading toolchain...'
    runBtn.disabled = true

    try {
        const manifestUrl = TOOLCHAIN_BASE_URL.replace(/\/$/, '') + '/manifest.json'
        const manifest = await loadManifest(manifestUrl)
        const tc = resolveToolchain(manifestUrl, manifest)

        statusEl.textContent = `Toolchain ${tc.manifest.version} loaded`
        outputEl.textContent =
            `compiler:  ${tc.compilerWasmUrl}\n` +
            `linker:    ${tc.linkerWasmUrl}\n` +
            `sysroot:   ${tc.sysrootIncludeUrl}\n` +
            `\n[demo] Full compilation not yet implemented.\n`
    } catch (e) {
        statusEl.textContent = 'Error'
        outputEl.textContent = String(e)
    } finally {
        runBtn.disabled = false
    }
}

runBtn.addEventListener('click', run)
