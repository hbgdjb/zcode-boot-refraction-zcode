/**
 * Install the boot layer into the desktop profile.
 *
 * 1. copy `lib/` + manifest + README into `~/.dsh/plugins/zcode-boot-refraction`
 * 2. back up `cordis.patch.yml`
 * 3. turn the previous particle boot layer off (two layers would fight)
 * 4. append the refraction insert block, once
 *
 * Idempotent: running it twice leaves a single block.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const src = dirname(dirname(fileURLToPath(import.meta.url)))
const home = homedir()
const pluginDir = join(home, '.dsh', 'plugins', 'zcode-boot-refraction')
const patchPath = join(home, '.dsh', 'profiles', 'desktop', 'cordis.patch.yml')

if (!existsSync(join(home, '.dsh'))) {
  console.error('no ~/.dsh profile found — install this by hand (see README §4)')
  process.exit(1)
}

mkdirSync(pluginDir, { recursive: true })
cpSync(join(src, 'lib'), join(pluginDir, 'lib'), { recursive: true })
copyFileSync(join(src, 'package.json'), join(pluginDir, 'package.json'))
if (existsSync(join(src, 'README.md'))) copyFileSync(join(src, 'README.md'), join(pluginDir, 'README.md'))

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const backup = patchPath + '.bak-refraction-' + stamp
copyFileSync(patchPath, backup)

let text = readFileSync(patchPath, 'utf8')

// Turn the particle layer off inside its own block only.
const begin = text.indexOf('# dsh-boot-particles (install.mjs) --- BEGIN')
const end = text.indexOf('# dsh-boot-particles (install.mjs) --- END')
if (begin >= 0 && end > begin) {
  const block = text.slice(begin, end)
  const off = block.replace(/enabled:\s*true/g, 'enabled: false')
  text = text.slice(0, begin) + off + text.slice(end)
}

const MARK = '# zcode-init-refraction (install)'
if (!text.includes(MARK)) {
  const normalized = 'file:///' + join(pluginDir, 'lib', 'index.js').replace(/\\/g, '/')
  const block = [
    '',
    MARK + ' --- BEGIN',
    '- insert:',
    '    - id: zcode-boot-refraction',
    '      name: "' + normalized + '"',
    '      config:',
    '        enabled: true',
    '        overlay: true',
    '        playOncePerSession: true',
    MARK + ' --- END',
    '',
  ].join('\n')
  text = text.replace(/\s*$/, '\n') + block
}

writeFileSync(patchPath, text)

console.log('plugin  ->', pluginDir)
console.log('patch   ->', patchPath)
console.log('backup  ->', backup)
console.log('restart ZCode to play the layer. Debug: ?zcb=off | still | freeze:2600 | pose:exit')
