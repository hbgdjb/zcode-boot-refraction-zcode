/**
 * Render the production injection as a standalone page.
 *
 * The host concatenates the field, the timeline and the mount call into one
 * classic script and pushes style/markup/script rows into the webserver. This
 * tool reproduces that exact bundle so a browser can prove the concatenation
 * parses and the layer cleans up, without booting the app.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { __test } from '../lib/index.js'

const css = __test.readAsset('boot.css')
const script = __test.bootScript({ playOncePerSession: false })

if (script.includes('</script')) throw new Error('bundle would break the host page')

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ZCode — Refraction / injection bundle</title>
<style>${css}</style>
<style>
  html, body { margin: 0; height: 100%; background: #0a0b0d; }
  .host { position: fixed; inset: 0; display: grid; place-items: center; color: #6b6b70; font: 12px/1.6 monospace; }
</style>
</head>
<body>
<div class="host">shell placeholder — the boot layer should cover this</div>
${__test.SCENE_HTML}
<script>${script}</script>
</body>
</html>`

const out = fileURLToPath(new URL('../preview/inject.html', import.meta.url))
writeFileSync(out, html)
console.log('wrote', out, `${(html.length / 1024).toFixed(1)}kb`)
