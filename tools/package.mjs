/**
 * Produce the two distributables, one per host.
 *
 *   dist/zcode-boot-refraction-zcode-<v>.zip
 *     the startup launcher for the ZCode desktop app: compiled host, WebView2
 *     assemblies, the film page, install/uninstall scripts, and the host source.
 *
 *   dist/zcode-boot-refraction-dsh-<v>.zip
 *     the installable DSH plugin: manifest, installer, and the film source.
 *
 * Neither carries screenshots, node_modules, or the staging tree.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const build = join(root, 'build')
const dist = join(root, 'dist')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version

function fresh(dir) {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
}

function zip(source, destination) {
  mkdirSync(dist, { recursive: true })
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', join(root, 'tools', 'zip.ps1'),
    '-Source', source,
    '-Destination', destination,
  ], { stdio: 'inherit' })
}

// 1. ZCode launcher
const zcode = join(build, 'zcode-boot-refraction-zcode')
fresh(zcode)

const payload = join(root, 'splash', 'dist')
const PAYLOAD = /^(ZCodeSplash\.exe|splash\.html|Microsoft\.Web\.WebView2\..*\.dll|WebView2Loader\.dll)$/
if (!existsSync(join(payload, 'ZCodeSplash.exe'))) {
  throw new Error('build the launcher first: npm run splash')
}
for (const name of readdirSync(payload)) {
  if (PAYLOAD.test(name)) copyFileSync(join(payload, name), join(zcode, name))
}

copyFileSync(join(root, 'splash', 'install.ps1'), join(zcode, 'install.ps1'))
copyFileSync(join(root, 'splash', 'uninstall.ps1'), join(zcode, 'uninstall.ps1'))
copyFileSync(join(root, 'splash', 'README.md'), join(zcode, 'README.md'))

const src = join(zcode, 'src')
mkdirSync(src, { recursive: true })
for (const name of ['Program.cs', 'app.manifest', 'build.ps1']) {
  copyFileSync(join(root, 'splash', name), join(src, name))
}
copyFileSync(join(root, 'splash', 'splash.html'), join(src, 'splash.html'))

const icon = join(zcode, 'icon')
mkdirSync(join(icon, 'png'), { recursive: true })
for (const name of ['zcode-refraction.ico', 'zcode-icon.svg', 'zcode-icon-1024.png']) {
  copyFileSync(join(root, 'icon', name), join(icon, name))
}
for (const name of readdirSync(join(root, 'icon', 'png'))) {
  if (/^icon-(16|24|32|48|64|128|256)\.png$/.test(name)) {
    copyFileSync(join(root, 'icon', 'png', name), join(icon, 'png', name))
  }
}

zip(zcode, join(dist, `zcode-boot-refraction-zcode-${version}.zip`))

// 2. DSH plugin
const plugin = join(build, 'zcode-boot-refraction')
fresh(plugin)

const manifest = {
  name: pkg.name.replace(/^@[^/]+\//, ''),
  version,
  private: true,
  description: 'Refraction boot film for the DSH desktop client: the mark writes itself, the field parts along its diagonal, one prismatic beam crosses it, then the real desktop is traced and handed back.',
  type: 'module',
  main: './lib/index.js',
  files: ['lib'],
  peerDependencies: pkg.peerDependencies,
  license: pkg.license,
}
writeFileSync(join(plugin, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
copyFileSync(join(root, 'dsh', 'install.mjs'), join(plugin, 'install.mjs'))
copyFileSync(join(root, 'dsh', 'README.md'), join(plugin, 'README.md'))
for (const name of readdirSync(join(root, 'lib'))) {
  const to = join(plugin, 'lib', name)
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(join(root, 'lib', name), to)
}

zip(plugin, join(dist, `zcode-boot-refraction-dsh-${version}.zip`))

// 3. phone build
const phone = join(build, 'zcode-boot-refraction-mobile')
fresh(phone)
copyFileSync(join(root, 'mobile', 'splash-mobile.html'), join(phone, 'splash-mobile.html'))
copyFileSync(join(root, 'mobile', 'README.md'), join(phone, 'README.md'))
zip(phone, join(dist, `zcode-boot-refraction-mobile-${version}.zip`))

console.log('\narchives:')
for (const name of [
  `zcode-boot-refraction-zcode-${version}.zip`,
  `zcode-boot-refraction-dsh-${version}.zip`,
  `zcode-boot-refraction-mobile-${version}.zip`,
]) {
  const path = join(dist, name)
  console.log(`  ${path}  ${(readFileSync(path).length / 1024).toFixed(1)}kb`)
}
