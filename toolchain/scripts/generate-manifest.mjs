import fs from 'fs'
import path from 'path'

const pkgDir = process.argv[2]
if (!pkgDir) {
    console.error('Usage: generate-manifest.mjs <pkg-dir>')
    process.exit(1)
}

const version = process.env.TOOLCHAIN_VERSION || '0.1.0'

const manifest = {
    name: 'cpp-wasm-toolchain',
    version,
    target: 'wasm32-wasi',
    compiler: {
        entry: 'compiler/clang.mjs',
        wasm: 'compiler/clang.wasm',
    },
    linker: {
        entry: 'linker/wasm-ld.mjs',
        wasm: 'linker/wasm-ld.wasm',
    },
    runtime: {
        entry: 'runtime/wasi-shim.js',
    },
    sysroot: {
        include: 'sysroot/include',
        lib: 'sysroot/lib/wasm32-wasi',
    },
}

const outPath = path.join(pkgDir, 'manifest.json')
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n')
console.log('manifest.json written')
