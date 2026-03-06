import { Toolchain } from '../packages/loader/src/index'

const TOOLCHAIN_BASE_URL = import.meta.env.VITE_TOOLCHAIN_BASE_URL ?? '/dist/cpp-wasm-toolchain/0.1.0'

const toolchain = new Toolchain(TOOLCHAIN_BASE_URL)

const codeEl = document.getElementById('code') as HTMLTextAreaElement
const outputEl = document.getElementById('output') as HTMLPreElement
const statusEl = document.getElementById('status') as HTMLSpanElement
const runBtn = document.getElementById('run') as HTMLButtonElement

async function run() {
    outputEl.textContent = ''
    statusEl.textContent = 'Compiling...'
    runBtn.disabled = true

    try {
        const source = codeEl.value
        const result = await toolchain.compile({
            source,
            filename: 'main.cpp',
            stdout: (s) => { outputEl.textContent += s },
            stderr: (s) => { outputEl.textContent += s },
        })

        if (!result.ok) {
            statusEl.textContent = 'Compile error'
            outputEl.textContent = result.diagnostics
        } else {
            statusEl.textContent = 'Done'
        }
    } catch (e) {
        statusEl.textContent = 'Error'
        outputEl.textContent = String(e)
    } finally {
        runBtn.disabled = false
    }
}

runBtn.addEventListener('click', run)
