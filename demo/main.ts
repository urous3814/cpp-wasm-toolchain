import { loadManifest, resolveToolchain, prepareExecution } from '../packages/loader/src/index'

// ── Config ────────────────────────────────────────────────────────────────────

const TOOLCHAIN_BASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TOOLCHAIN_BASE_URL
    ?? '/dist/cpp-wasm-toolchain/0.1.0'

// ── Example sources (inlined for browser deployment) ─────────────────────────

const EXAMPLES: Record<string, string> = {
  'hello.cpp': `#include <iostream>

int main() {
    std::cout << "hello wasm" << std::endl;
    return 0;
}
`,
  'vector_sort.cpp': `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {3, 1, 2};
    std::sort(v.begin(), v.end());
    for (int x : v) std::cout << x << " ";
    std::cout << std::endl;
    return 0;
}
`,
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const versionEl    = document.getElementById('version') as HTMLSpanElement
const infoEl       = document.getElementById('toolchain-info') as HTMLDivElement
const codeEl       = document.getElementById('code') as HTMLTextAreaElement
const runBtn       = document.getElementById('run') as HTMLButtonElement
const statusEl     = document.getElementById('status') as HTMLSpanElement
const stdoutEl     = document.getElementById('stdout') as HTMLPreElement
const stderrEl     = document.getElementById('stderr') as HTMLPreElement
const exampleBtns  = document.querySelectorAll<HTMLButtonElement>('[data-example]')

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(msg: string, ok = true): void {
  statusEl.textContent = msg
  statusEl.className = ok ? 'status-ok' : 'status-err'
}

function clearOutput(): void {
  stdoutEl.textContent = ''
  stderrEl.textContent = ''
}

// ── Toolchain init ────────────────────────────────────────────────────────────

async function initToolchain() {
  const manifestUrl = TOOLCHAIN_BASE_URL.replace(/\/$/, '') + '/manifest.json'
  try {
    const manifest = await loadManifest(manifestUrl)
    const toolchain = resolveToolchain(manifestUrl, manifest)
    const execution = prepareExecution(toolchain)

    versionEl.textContent = `v${manifest.version}`
    infoEl.textContent =
      `Toolchain ${manifest.version} — target: ${manifest.target} — runtime: ${execution.runtimeModuleUrl}`
    infoEl.className = 'info-bar info-ok'

    return execution
  } catch (e) {
    infoEl.textContent = `Toolchain unavailable: ${e}`
    infoEl.className = 'info-bar info-err'
    return null
  }
}

// ── Run handler ───────────────────────────────────────────────────────────────

async function handleRun(): Promise<void> {
  clearOutput()
  runBtn.disabled = true
  setStatus('Compiling…')

  try {
    // TODO(M5): invoke worker compile + run with codeEl.value
    stderrEl.textContent = '[demo] Full compile/run not yet wired. Toolchain ready.'
    setStatus('Pending runtime wiring')
  } catch (e) {
    stderrEl.textContent = String(e)
    setStatus('Error', false)
  } finally {
    runBtn.disabled = false
  }
}

// ── Example buttons ───────────────────────────────────────────────────────────

exampleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.example ?? ''
    if (EXAMPLES[name]) {
      codeEl.value = EXAMPLES[name]
      setStatus(`Loaded ${name}`)
    }
  })
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────

runBtn.addEventListener('click', handleRun)

// Set default example
codeEl.value = EXAMPLES['hello.cpp']

initToolchain()
