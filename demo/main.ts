import { loadManifest, resolveToolchain, prepareExecution } from '../packages/loader/src/index'
import type { WorkerRequest, WorkerResponse } from '../packages/worker/src/messages'

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
const workerInfoEl = document.getElementById('worker-info') as HTMLDivElement
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

function setInfo(el: HTMLElement, msg: string, state: 'pending' | 'ok' | 'err'): void {
  el.textContent = msg
  el.className = `info-bar${state === 'ok' ? ' info-ok' : state === 'err' ? ' info-err' : ''}`
}

function clearOutput(): void {
  stdoutEl.textContent = ''
  stderrEl.textContent = ''
}

// ── WorkerClient ──────────────────────────────────────────────────────────────

class WorkerClient {
  private worker: Worker
  private handlers = new Map<string, (msg: WorkerResponse) => void>()

  constructor(url: string) {
    this.worker = new Worker(url, { type: 'module' })
    this.worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      const handler = this.handlers.get(msg.type)
      if (handler) handler(msg)
      const wildcardHandler = this.handlers.get('*')
      if (wildcardHandler) wildcardHandler(msg)
    })
    this.worker.addEventListener('error', (e) => {
      setInfo(workerInfoEl, `Worker error: ${e.message}`, 'err')
    })
  }

  on(type: string, handler: (msg: WorkerResponse) => void): void {
    this.handlers.set(type, handler)
  }

  send(msg: WorkerRequest): void {
    this.worker.postMessage(msg)
  }

  terminate(): void {
    this.worker.terminate()
  }
}

// ── Toolchain init ────────────────────────────────────────────────────────────

async function initToolchain(): Promise<void> {
  const manifestUrl = TOOLCHAIN_BASE_URL.replace(/\/$/, '') + '/manifest.json'
  try {
    const manifest = await loadManifest(manifestUrl)
    const toolchain = resolveToolchain(manifestUrl, manifest)
    const execution = prepareExecution(toolchain)

    versionEl.textContent = `v${manifest.version}`
    setInfo(
      infoEl,
      `Toolchain ${manifest.version} — ${manifest.target} — runtime: ${execution.runtimeModuleUrl}`,
      'ok',
    )
  } catch (e) {
    setInfo(infoEl, `Toolchain unavailable: ${e}`, 'err')
  }
}

// ── Worker init ───────────────────────────────────────────────────────────────

function initWorker(): WorkerClient | null {
  try {
    const client = new WorkerClient('./worker.js')

    client.on('ready', () => {
      setInfo(workerInfoEl, 'Worker: loaded — sending ping…', 'pending')
      client.send({ type: 'ping' })
    })

    client.on('pong', () => {
      setInfo(workerInfoEl, 'Worker: ping OK — sending init…', 'pending')
      client.send({ type: 'init', baseUrl: TOOLCHAIN_BASE_URL })
    })

    client.on('init:ok', (msg) => {
      if (msg.type === 'init:ok') {
        setInfo(workerInfoEl, `Worker: ready (toolchain v${msg.version})`, 'ok')
      }
    })

    client.on('error', (msg) => {
      if (msg.type === 'error') {
        setInfo(workerInfoEl, `Worker error: ${msg.message}`, 'err')
      }
    })

    return client
  } catch (e) {
    setInfo(workerInfoEl, `Worker unavailable: ${e}`, 'err')
    return null
  }
}

// ── Run handler ───────────────────────────────────────────────────────────────

async function handleRun(): Promise<void> {
  clearOutput()
  runBtn.disabled = true
  setStatus('Compiling…')

  try {
    // TODO(M5): send compile request to worker with codeEl.value
    stderrEl.textContent = '[demo] Compile/run not yet wired. Worker and toolchain are ready.'
    setStatus('Pending compile wiring')
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
codeEl.value = EXAMPLES['hello.cpp']

initToolchain()
initWorker()
