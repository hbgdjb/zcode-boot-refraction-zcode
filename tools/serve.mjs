/**
 * Zero-dependency static server for the preview page.
 * Binds to loopback only; the package is never served beyond this machine.
 */
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.env.PORT || 8731)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webm': 'video/webm',
}

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  const entry = url === '/' ? '/preview/index.html' : url.endsWith('/') ? url + 'index.html' : url
  const target = normalize(join(root, entry))
  if (!target.startsWith(root)) {
    res.statusCode = 403
    res.end('forbidden')
    return
  }
  try {
    if (!statSync(target).isFile()) throw new Error('not a file')
    res.setHeader('content-type', TYPES[extname(target)] || 'application/octet-stream')
    res.setHeader('cache-control', 'no-store')
    createReadStream(target).pipe(res)
  } catch (error) {
    res.statusCode = 404
    res.end('not found')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`refraction preview → http://127.0.0.1:${port}/preview/`)
})
