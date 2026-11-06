/**
 * Build the phone splash as one self-contained page.
 *
 * The desktop splash inlines the same field and CSS; the phone build swaps the
 * timeline controller for the portrait one, so the two stay visually identical
 * while each keeps its own pacing and shell.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_HTML } from '../lib/scene.js'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const css = read('../lib/boot.css')
const mobileCss = read('../mobile/mobile.css')
const field = read('../lib/field.js')
const controller = read('../mobile/controller.js')

for (const asset of [field, controller]) {
  if (asset.includes('</script')) throw new Error('bundle would close the host script element')
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050506">
<title>ZCode</title>
<style>${css}</style>
<style>${mobileCss}</style>
</head>
<body>
${SCENE_HTML}
<script>${field}
;${controller}</script>
</body>
</html>`

const dir = fileURLToPath(new URL('../mobile/', import.meta.url))
mkdirSync(dir, { recursive: true })
const out = dir + 'splash-mobile.html'
writeFileSync(out, html)
console.log('wrote', out, `${(html.length / 1024).toFixed(1)}kb`)
