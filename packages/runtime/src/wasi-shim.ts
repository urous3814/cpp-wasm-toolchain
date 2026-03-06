/**
 * wasi-shim.ts
 *
 * Browser-compatible WASI runtime shim for executing wasm32-wasi command-mode
 * programs. Handles stdin/stdout/stderr, argv, timeouts, and output limits.
 *
 * Does NOT perform compilation. Expects a fully linked WebAssembly program
 * with a `_start` export (WASI command mode).
 */

// ── Public types ─────────────────────────────────────────────────────────────

export type RunOptions = {
  /** Compiled module or raw wasm bytes. */
  wasmModule: WebAssembly.Module | ArrayBuffer;
  /** Command-line arguments (argv[0] is the program name). */
  argv?: string[];
  /** Text fed to stdin. */
  stdin?: string;
  /** Maximum execution time in milliseconds. Default: 3000 */
  timeoutMs?: number;
  /** Maximum cumulative stdout+stderr bytes. Default: 65536 */
  maxOutputBytes?: number;
  /** Called for each stdout chunk as the program writes it. */
  onStdout?: (chunk: string) => void;
  /** Called for each stderr chunk as the program writes it. */
  onStderr?: (chunk: string) => void;
};

export type RunResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};

// ── Internal sentinel errors ──────────────────────────────────────────────────

class WasiExitError extends Error {
  constructor(public readonly code: number) {
    super(`WASI proc_exit(${code})`);
  }
}

class WasiTimeoutError extends Error {
  constructor() {
    super('WASI execution timed out');
  }
}

class WasiOutputLimitError extends Error {
  constructor() {
    super('WASI output limit exceeded');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Compile an ArrayBuffer into a WebAssembly.Module, or pass through an
 * already-compiled module unchanged.
 */
async function normalizeWasmModule(
  source: WebAssembly.Module | ArrayBuffer,
): Promise<WebAssembly.Module> {
  if (source instanceof ArrayBuffer) {
    return WebAssembly.compile(source);
  }
  return source;
}

/**
 * Encode stdin and return a mutable cursor over the bytes.
 */
function createInputReader(stdin: string): {
  bytes: Uint8Array;
  cursor: { offset: number };
} {
  const encoder = new TextEncoder();
  return { bytes: encoder.encode(stdin), cursor: { offset: 0 } };
}

/**
 * Create accumulator arrays for stdout and stderr.
 */
function createStdioBuffers(): {
  stdoutChunks: string[];
  stderrChunks: string[];
} {
  return { stdoutChunks: [], stderrChunks: [] };
}

/**
 * Build a byte-counting guard that throws WasiOutputLimitError when the
 * total written bytes would exceed maxBytes.
 */
function enforceOutputLimit(maxBytes: number): {
  add(n: number): void;
  total: number;
} {
  const state = { total: 0 };
  return {
    get total() {
      return state.total;
    },
    add(n: number) {
      state.total += n;
      if (state.total > maxBytes) {
        throw new WasiOutputLimitError();
      }
    },
  };
}

/**
 * Build the fd_write WASI handler. Writes to stdout (fd=1) or stderr (fd=2).
 * Invokes the optional streaming callback and accumulates into chunk arrays.
 */
function createOutputWriter(
  getMemory: () => WebAssembly.Memory,
  stdoutChunks: string[],
  stderrChunks: string[],
  outputGuard: ReturnType<typeof enforceOutputLimit>,
  onStdout: ((chunk: string) => void) | undefined,
  onStderr: ((chunk: string) => void) | undefined,
  getStartMs: () => number,
  timeoutMs: number,
) {
  const decoder = new TextDecoder();

  return (fd: number, iovs: number, iovsLen: number, nwritten: number): number => {
    if (fd !== 1 && fd !== 2) return 8; // EBADF

    // Timeout check on every write (practical interruption point)
    if (Date.now() - getStartMs() > timeoutMs) {
      throw new WasiTimeoutError();
    }

    const mem = new DataView(getMemory().buffer);
    const bytes = new Uint8Array(getMemory().buffer);
    let totalWritten = 0;
    const parts: string[] = [];

    for (let i = 0; i < iovsLen; i++) {
      const ptr = mem.getUint32(iovs + i * 8, true);
      const len = mem.getUint32(iovs + i * 8 + 4, true);
      outputGuard.add(len);
      parts.push(decoder.decode(bytes.subarray(ptr, ptr + len)));
      totalWritten += len;
    }

    const text = parts.join('');
    if (fd === 1) {
      stdoutChunks.push(text);
      onStdout?.(text);
    } else {
      stderrChunks.push(text);
      onStderr?.(text);
    }

    mem.setUint32(nwritten, totalWritten, true);
    return 0;
  };
}

// ── WASI import object builder ────────────────────────────────────────────────

function buildWasiImports(
  getMemory: () => WebAssembly.Memory,
  argv: string[],
  inputReader: ReturnType<typeof createInputReader>,
  stdoutChunks: string[],
  stderrChunks: string[],
  outputGuard: ReturnType<typeof enforceOutputLimit>,
  onStdout: RunOptions['onStdout'],
  onStderr: RunOptions['onStderr'],
  getStartMs: () => number,
  timeoutMs: number,
): WebAssembly.ModuleImports {
  const encoder = new TextEncoder();

  const fd_write = createOutputWriter(
    getMemory,
    stdoutChunks,
    stderrChunks,
    outputGuard,
    onStdout,
    onStderr,
    getStartMs,
    timeoutMs,
  );

  return {
    // argv
    args_sizes_get(argc: number, argvBufSize: number): number {
      const totalBuf = argv.reduce((s, a) => s + encoder.encode(a).length + 1, 0);
      const mem = new DataView(getMemory().buffer);
      mem.setUint32(argc, argv.length, true);
      mem.setUint32(argvBufSize, totalBuf, true);
      return 0;
    },
    args_get(argvPtr: number, argvBufPtr: number): number {
      const mem = new DataView(getMemory().buffer);
      const buf = new Uint8Array(getMemory().buffer);
      let bufOffset = argvBufPtr;
      argv.forEach((arg, i) => {
        mem.setUint32(argvPtr + i * 4, bufOffset, true);
        const encoded = encoder.encode(arg);
        buf.set(encoded, bufOffset);
        buf[bufOffset + encoded.length] = 0;
        bufOffset += encoded.length + 1;
      });
      return 0;
    },

    // environ (empty)
    environ_sizes_get(count: number, bufSize: number): number {
      const mem = new DataView(getMemory().buffer);
      mem.setUint32(count, 0, true);
      mem.setUint32(bufSize, 0, true);
      return 0;
    },
    environ_get: (): number => 0,

    // clock
    clock_time_get(_id: number, _precision: bigint, timePtr: number): number {
      const mem = new DataView(getMemory().buffer);
      mem.setBigUint64(timePtr, BigInt(Date.now()) * 1_000_000n, true);
      return 0;
    },

    // fd ops
    fd_close: (): number => 0,
    fd_fdstat_get: (): number => 0,
    fd_seek: (): number => 0,

    fd_read(fd: number, iovs: number, iovsLen: number, nread: number): number {
      if (fd !== 0) return 8; // EBADF
      const mem = new DataView(getMemory().buffer);
      const buf = new Uint8Array(getMemory().buffer);
      let totalRead = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = mem.getUint32(iovs + i * 8, true);
        const len = mem.getUint32(iovs + i * 8 + 4, true);
        const available = inputReader.bytes.length - inputReader.cursor.offset;
        if (available <= 0) break;
        const toRead = Math.min(len, available);
        buf.set(
          inputReader.bytes.subarray(
            inputReader.cursor.offset,
            inputReader.cursor.offset + toRead,
          ),
          ptr,
        );
        inputReader.cursor.offset += toRead;
        totalRead += toRead;
      }
      mem.setUint32(nread, totalRead, true);
      return 0;
    },

    fd_write,

    // process
    proc_exit(code: number): never {
      throw new WasiExitError(code);
    },

    // filesystem stubs
    path_open: (): number => 52, // ENOSYS
    path_filestat_get: (): number => 52,

    // random
    random_get(buf: number, bufLen: number): number {
      const bytes = new Uint8Array(getMemory().buffer, buf, bufLen);
      crypto.getRandomValues(bytes);
      return 0;
    },
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function runWasiProgram(options: RunOptions): Promise<RunResult> {
  const {
    wasmModule,
    argv = [],
    stdin = '',
    timeoutMs = 3_000,
    maxOutputBytes = 65_536,
    onStdout,
    onStderr,
  } = options;

  const module = await normalizeWasmModule(wasmModule);
  const inputReader = createInputReader(stdin);
  const { stdoutChunks, stderrChunks } = createStdioBuffers();
  const outputGuard = enforceOutputLimit(maxOutputBytes);

  let memory!: WebAssembly.Memory;
  const getMemory = () => memory;
  const startMs = Date.now();
  const getStartMs = () => startMs;

  const wasiImports = buildWasiImports(
    getMemory,
    argv,
    inputReader,
    stdoutChunks,
    stderrChunks,
    outputGuard,
    onStdout,
    onStderr,
    getStartMs,
    timeoutMs,
  );

  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasiImports,
  });

  memory = instance.exports.memory as WebAssembly.Memory;

  let exitCode = 0;
  let timedOut = false;

  try {
    const start = instance.exports._start as () => void;
    start();
  } catch (e) {
    if (e instanceof WasiExitError) {
      exitCode = e.code;
    } else if (e instanceof WasiTimeoutError) {
      timedOut = true;
      exitCode = 1;
    } else if (e instanceof WasiOutputLimitError) {
      stderrChunks.push('\n[runtime] output limit exceeded\n');
      exitCode = 1;
    } else {
      throw e;
    }
  }

  const durationMs = Date.now() - startMs;

  return {
    ok: exitCode === 0 && !timedOut,
    exitCode,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    timedOut,
    durationMs,
  };
}
