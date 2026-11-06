/**
 * Build the app icon.
 *
 * Renders the SVG at each size a Windows icon actually uses (so the small
 * sizes get their own anti-aliasing instead of a downscaled master), then
 * packs the PNGs into a single .ico.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const iconDir = join(root, 'icon')
const outDir = join(iconDir, 'png')
const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SIZES = [16, 24, 32, 48, 64, 128, 256]

if (!existsSync(join(iconDir, 'render.html'))) throw new Error('icon/render.html is missing')
mkdirSync(outDir, { recursive: true })

const page = 'file:///' + join(iconDir, 'render.html').replace(/\\/g, '/')

function render(size, path) {
  if (existsSync(path)) rmSync(path)
  execFileSync(edge, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--virtual-time-budget=1200',
    '--default-background-color=00000000',
    '--window-size=' + size + ',' + size,
    '--screenshot=' + path,
    page,
  ], { stdio: 'ignore', timeout: 60000 })
}

// Headless Edge has a minimum layout viewport, so anything under ~512 comes
// back cropped. Render the master and a clean 512, then resample down from 512.
render(1024, join(iconDir, 'zcode-icon-1024.png'))
render(512, join(iconDir, 'png', 'icon-512.png'))

const entries = []
for (const size of SIZES) {
  const path = join(outDir, 'icon-' + size + '.png')
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', join(outDir, 'icon-512.png'),
    '-vf', 'scale=' + size + ':' + size + ':flags=lanczos',
    path,
  ], { stdio: 'ignore' })
  entries.push({ size, png: readFileSync(path) })
}

/* ICO: 6-byte header, 16-byte directory entry per image, then PNG payloads. */
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(entries.length, 4)

const directory = Buffer.alloc(16 * entries.length)
let offset = 6 + directory.length
entries.forEach((entry, i) => {
  const at = i * 16
  const dim = entry.size >= 256 ? 0 : entry.size
  directory.writeUInt8(dim, at)
  directory.writeUInt8(dim, at + 1)
  directory.writeUInt8(0, at + 2)
  directory.writeUInt8(0, at + 3)
  directory.writeUInt16LE(1, at + 4)
  directory.writeUInt16LE(32, at + 6)
  directory.writeUInt32LE(entry.png.length, at + 8)
  directory.writeUInt32LE(offset, at + 12)
  offset += entry.png.length
})

const ico = Buffer.concat([header, directory, ...entries.map((entry) => entry.png)])
const icoPath = join(iconDir, 'zcode-refraction.ico')
writeFileSync(icoPath, ico)

console.log('icon/master  ->', join(iconDir, 'zcode-icon-1024.png'))
console.log('icon/png     ->', entries.map((entry) => entry.size + 'px').join(', '))
console.log('icon/ico     ->', icoPath, (ico.length / 1024).toFixed(1) + 'kb')
