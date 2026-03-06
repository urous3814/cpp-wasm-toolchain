import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const pkgDir = process.argv[2]
if (!pkgDir) {
    console.error('Usage: generate-checksums.mjs <pkg-dir>')
    process.exit(1)
}

function sha256(filePath) {
    const data = fs.readFileSync(filePath)
    return crypto.createHash('sha256').update(data).digest('hex')
}

function collectFiles(dir, base = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files = []
    for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
            files.push(...collectFiles(full, base))
        } else {
            files.push(path.relative(base, full))
        }
    }
    return files.sort()
}

const files = collectFiles(pkgDir).filter(f => f !== 'checksums.txt')
const lines = files.map(f => `${sha256(path.join(pkgDir, f))}  ${f}`)
const outPath = path.join(pkgDir, 'checksums.txt')
fs.writeFileSync(outPath, lines.join('\n') + '\n')
console.log(`checksums.txt written (${files.length} files)`)
