export interface WasiRunOptions {
    stdin?: string
    stdout?: (s: string) => void
    stderr?: (s: string) => void
    timeoutMs?: number
    maxOutputBytes?: number
}

export async function runWasi(
    wasm: WebAssembly.Module,
    opts: WasiRunOptions = {}
): Promise<void> {
    const {
        stdin = '',
        stdout = console.log,
        stderr = console.error,
        timeoutMs = 10_000,
        maxOutputBytes = 1024 * 1024,
    } = opts

    let stdinOffset = 0
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    let outputBytes = 0

    const stdinBytes = encoder.encode(stdin)

    const wasi = {
        args_get: () => 0,
        args_sizes_get: (argc: number, argvBufSize: number) => {
            const mem = new DataView(memory.buffer)
            mem.setUint32(argc, 0, true)
            mem.setUint32(argvBufSize, 0, true)
            return 0
        },
        environ_get: () => 0,
        environ_sizes_get: (environCount: number, environBufSize: number) => {
            const mem = new DataView(memory.buffer)
            mem.setUint32(environCount, 0, true)
            mem.setUint32(environBufSize, 0, true)
            return 0
        },
        clock_time_get: (_id: number, _precision: bigint, time: number) => {
            const mem = new DataView(memory.buffer)
            mem.setBigUint64(time, BigInt(Date.now()) * 1_000_000n, true)
            return 0
        },
        fd_close: () => 0,
        fd_fdstat_get: () => 0,
        fd_seek: () => 0,
        fd_read: (fd: number, iovs: number, iovsLen: number, nread: number) => {
            if (fd !== 0) return 8 // EBADF
            const mem = new DataView(memory.buffer)
            let totalRead = 0
            for (let i = 0; i < iovsLen; i++) {
                const ptr = mem.getUint32(iovs + i * 8, true)
                const len = mem.getUint32(iovs + i * 8 + 4, true)
                const available = stdinBytes.length - stdinOffset
                if (available <= 0) break
                const toRead = Math.min(len, available)
                new Uint8Array(memory.buffer).set(stdinBytes.subarray(stdinOffset, stdinOffset + toRead), ptr)
                stdinOffset += toRead
                totalRead += toRead
            }
            mem.setUint32(nread, totalRead, true)
            return 0
        },
        fd_write: (fd: number, iovs: number, iovsLen: number, nwritten: number) => {
            if (fd !== 1 && fd !== 2) return 8 // EBADF
            const mem = new DataView(memory.buffer)
            const bytes = new Uint8Array(memory.buffer)
            let totalWritten = 0
            const chunks: string[] = []
            for (let i = 0; i < iovsLen; i++) {
                const ptr = mem.getUint32(iovs + i * 8, true)
                const len = mem.getUint32(iovs + i * 8 + 4, true)
                outputBytes += len
                if (outputBytes > maxOutputBytes) return 28 // ENOSPC
                chunks.push(decoder.decode(bytes.subarray(ptr, ptr + len)))
                totalWritten += len
            }
            const text = chunks.join('')
            if (fd === 1) stdout(text)
            else stderr(text)
            mem.setUint32(nwritten, totalWritten, true)
            return 0
        },
        proc_exit: (code: number) => {
            throw new WasiExitError(code)
        },
        path_open: () => 28,
        path_filestat_get: () => 28,
        random_get: (buf: number, bufLen: number) => {
            const bytes = new Uint8Array(memory.buffer, buf, bufLen)
            crypto.getRandomValues(bytes)
            return 0
        },
    }

    let memory!: WebAssembly.Memory

    const instance = await WebAssembly.instantiate(wasm, {
        wasi_snapshot_preview1: wasi as unknown as WebAssembly.ModuleImports,
        env: {
            memory: new WebAssembly.Memory({ initial: 256 }),
        },
    })

    memory = instance.exports.memory as WebAssembly.Memory

    const timeout = setTimeout(() => {
        throw new Error(`WASI execution timed out after ${timeoutMs}ms`)
    }, timeoutMs)

    try {
        const start = instance.exports._start as () => void
        start()
    } catch (e) {
        if (e instanceof WasiExitError && e.code === 0) return
        throw e
    } finally {
        clearTimeout(timeout)
    }
}

export class WasiExitError extends Error {
    constructor(public readonly code: number) {
        super(`WASI process exited with code ${code}`)
    }
}
