/**
 * Build the standalone splash page.
 *
 * Same film, different ending: a splash has no desktop to trace, so the slab
 * lands, holds, and the page reports `zcb:done` so the native window can hand
 * the screen to the app. Everything is inlined: WebView2 loads it over
 * file://, where module scripts and separate stylesheets do not resolve.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_HTML } from '../lib/scene.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const css = read('../lib/boot.css')
const field = read('../lib/field.js')
const overlay = read('../lib/overlay.js')

const mount = `;(function () {
  function post(message) {
    try {
      if (window.chrome && window.chrome.webview) window.chrome.webview.postMessage(message)
    } catch (error) { /* plain browser */ }
  }
  var host = document.getElementById('zcb-root')
  if (!host) return
  var template = host.outerHTML
  // The template replaces the original node; leaving it in place would stack a
  // second, never-animated layer on top of the film.
  host.parentNode.removeChild(host)
  var loop = /(?:^|[?&])loop(?:[=&]|$)/.test(location.search)

  function mount() {
    var wrap = document.createElement('div')
    wrap.innerHTML = template
    var root = wrap.firstElementChild
    document.body.insertBefore(root, document.body.firstChild)
    var handle = window.ZCBoot.play({ root: root, playOncePerSession: false, mode: 'splash', dark: true })
    window.__ZCB_HANDLE__ = handle
    if (!handle) post('zcb:done')
  }

  window.addEventListener('zcb:done', function () {
    post('zcb:done')
    // ?loop only exists for previewing in a browser; the launcher never uses it.
    if (loop) setTimeout(mount, 1100)
  })

  mount()
})()`

if (field.includes('</script') || overlay.includes('</script') || mount.includes('</script')) {
  throw new Error('bundle would close the host script element')
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ZCode</title>
<style>${css}</style>
<style>
  html, body { margin: 0; height: 100%; background: #ffffff; overflow: hidden; }
  body { cursor: none; }
  .zcb__skip { display: none !important; }
</style>
</head>
<body>
${SCENE_HTML}
<script>${field}
;${overlay}
;${mount}</script>
</body>
</html>`

const dir = fileURLToPath(new URL('../splash/', import.meta.url))
mkdirSync(dir, { recursive: true })
const out = dir + 'splash.html'
writeFileSync(out, html)
console.log('wrote', out, `${(html.length / 1024).toFixed(1)}kb`)
