/**
 * `@zcode/boot-refraction` — host half.
 *
 * Contributes one full-screen layer to every index render through the
 * webserver's structured injection table:
 *
 *   lib/index.js     this module
 *   lib/scene.js     the layer's DOM, one string shared with the preview
 *   lib/boot.css     tokens, paint order, every act
 *   lib/overlay.js   timeline driver (inlined and executed)
 *   lib/field.js     prismatic canvas field (inlined and executed)
 *
 * The layer covers the shell while it mounts, plays the film, then lifts away
 * and removes itself. It dispatches `zcb:done` and touches nothing else.
 */

import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENE_HTML } from './scene.js'

const NAME = 'zcode-boot-refraction'
const LIB_DIR = new URL('./', import.meta.url)

const assets = new Map()

const DEFAULTS = {
  enabled: true,
  overlay: true,
  playOncePerSession: true,
}

/**
 * Read a sibling asset, re-reading only when it changed on disk so a live
 * patch cycle serves edited CSS without a process restart.
 *
 * @param {string} name - file name inside this package's `lib/` directory.
 * @returns {string} the file's UTF-8 text.
 */
function readAsset(name) {
  const path = fileURLToPath(new URL(name, LIB_DIR))
  const stat = statSync(path)
  const cached = assets.get(name)
  if (cached !== undefined && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.text
  }
  const text = readFileSync(path, 'utf8')
  assets.set(name, { mtimeMs: stat.mtimeMs, size: stat.size, text })
  return text
}

/**
 * Merge the live config over the defaults, ignoring malformed fields.
 *
 * @param {unknown} raw - the loader-provided plugin config.
 * @returns {typeof DEFAULTS} a complete config.
 */
function resolveConfig(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const config = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS)) {
    const value = source[key]
    if (value === undefined) continue
    if (typeof value === typeof DEFAULTS[key]) config[key] = value
    else console.warn(`${NAME}: ignoring config.${key}: expected ${typeof DEFAULTS[key]}`)
  }
  return config
}

/**
 * The browser half, serialized into one classic script.
 *
 * The field and the timeline are separate IIFEs that export onto `window`, so
 * they are concatenated rather than bundled. The generated body must never
 * contain a closing script tag or the host's HTML injection would break.
 *
 * @param {typeof DEFAULTS} config - resolved plugin config.
 * @returns {string} an inline classic script body.
 */
function bootScript(config) {
  const settings = {
    playOncePerSession: config.playOncePerSession,
  }
  const body = '(function(){'
    + 'var cfg=' + JSON.stringify(settings) + ';'
    + 'var host=document.getElementById("zcb-root");'
    + 'if(!host)return;'
    + 'if(window.__ZCB_MOUNTED__)return;window.__ZCB_MOUNTED__=1;'
    + readAsset('field.js') + ';\n'
    + readAsset('overlay.js') + ';\n'
    + 'if(!window.ZCBoot){host.remove();return;}'
    + 'var handle=window.ZCBoot.play({root:host,playOncePerSession:cfg.playOncePerSession!==false});'
    + 'if(!handle){host.remove();return;}'
    + 'window.__ZCB_HANDLE__=handle;'
    + 'setTimeout(function(){try{'
    + 'var el=document.getElementById("zcb-root");'
    + 'if(el&&el.parentNode)el.parentNode.removeChild(el);'
    + 'document.documentElement.removeAttribute("data-zcb-boot");'
    + '}catch(e){}},16000);'
    + '})();'
  if (body.includes('</script')) {
    throw new Error('bootScript: generated body must not contain a closing script tag')
  }
  return body
}

/**
 * Register the injection on the profile's webserver.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {unknown} rawConfig - loader-provided config.
 */
export function apply(ctx, rawConfig) {
  const config = resolveConfig(rawConfig)
  if (!config.enabled || !config.overlay) return
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.on('webserver/index-inject', (table) => {
      const already = table.some(
        (row) => row.kind === 'html' && typeof row.html === 'string' && row.html.includes('zcb-root'),
      )
      if (already) return
      table.push({ kind: 'style', text: readAsset('boot.css') })
      table.push({ kind: 'html', placement: 'body', html: SCENE_HTML })
      table.push({ kind: 'script', placement: 'body', text: bootScript(config) })
    })
    webCtx.logger?.debug?.(`${NAME}: refraction boot layer on`)
  })
}

export const name = NAME

/**
 * Test seam: the exact pieces the host injects. Used by
 * `tools/build-inject-preview.mjs` to render the production bundle outside the
 * app, so the single-script concatenation is exercised the same way the
 * webserver will run it.
 */
export const __test = { bootScript, SCENE_HTML, readAsset }
