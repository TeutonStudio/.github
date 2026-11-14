import { cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, run, treeHash } from './common.mjs'

const args = process.argv.slice(2), paths = {}
for (let i = 0; i < args.length; i += 2) {
  if (!['--copycat', '--ccvisual'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: npm run internal -- [--copycat /repo] [--ccvisual /repo]')
  paths[args[i].slice(2)] = resolve(args[i + 1])
}
paths.copycat ??= resolve(root, '../../Copycat Architect')
paths.ccvisual ??= resolve(root, '../../CCVisual')
const output = join(root, '.internal-dist')
rmSync(output, { recursive: true, force: true })
cpSync(join(root, 'shell'), output, { recursive: true })
cpSync(join(root, '../docs/GRAPHSTUDIO.md'), join(output, 'plan.md'))
const adapters = []
let failed = false
function sourceInfo(path) {
  return { sourceCommit: run('git', ['rev-parse', 'HEAD'], path, true),
    workingTree: run('git', ['status', '--porcelain'], path, true) ? 'modified' : 'clean',
    sourceSha256: treeHash(join(path, 'src/main')) }
}
function testSummary(path) {
  const directory = join(path, 'build/test-results/test')
  const total = { tests: 0, failures: 0, errors: 0, skipped: 0 }
  for (const file of readdirSync(directory).filter(name => name.endsWith('.xml'))) {
    const header = readFileSync(join(directory, file), 'utf8').match(/<testsuite\b[^>]*>/)?.[0] || ''
    for (const key of Object.keys(total)) total[key] += Number(header.match(new RegExp(`\\b${key}="(\\d+)"`))?.[1] || 0)
  }
  if (!total.tests || total.failures || total.errors) throw new Error('Native test report is empty or contains failures')
  return total
}
for (const [id, path] of Object.entries(paths)) {
  const entry = { id, name: id === 'copycat' ? 'Copycat Architect' : 'CC Visual', status: 'failed', checks: {} }
  adapters.push(entry)
  try {
    if (!existsSync(join(path, 'gradlew'))) throw new Error(`No mod checkout: ${path}`)
    Object.assign(entry, sourceInfo(path))
    // Re-run tests so a previous report cannot be mistaken for this development stand.
    run('./gradlew', ['test', '--offline', '--rerun'], path)
    entry.checks.nativeTests = testSummary(path)
    if (id === 'copycat') {
      const web = join(path, 'web/graph-editor')
      if (!existsSync(join(web, 'package.json'))) throw new Error('Expected local TypeScript prototype in web/graph-editor')
      run('npm', ['test'], web)
      run('npm', ['run', 'build'], web)
      cpSync(join(web, 'dist'), join(output, 'copycat'), { recursive: true })
      entry.url = './copycat/'
      entry.status = 'internal-prototype'
      entry.checks.browserTests = 'passed'
      entry.note = 'Lokaler TypeScript-Prototyp. JVM- und Browsertests sind getrennt; ein Browser→Mod-Austausch ist hier noch nicht nachgewiesen.'
    } else {
      entry.status = 'native-tested'
      entry.note = 'Native Modelltests ausgeführt. Den KilaGraph-Editor im Minecraft-Client prüfen; der Browseradapter ist geplant.'
    }
    // Detect edits during a long-running test/build, including uncommitted changes.
    if (entry.sourceSha256 !== treeHash(join(path, 'src/main'))) throw new Error('Sources changed during verification; run again')
  } catch (error) {
    failed = true
    delete entry.url
    entry.status = 'failed'
    entry.note = error.message
    console.error(`${entry.name}: ${error.message}`)
  }
}
writeFileSync(join(output, 'studio.json'), JSON.stringify({ schema: 1, channel: 'internal', builtAt: new Date().toISOString(), adapters }, null, 2) + '\n')
console.log(`Internal results: ${output}. Preview: npm run preview -- --internal`)
if (failed) process.exitCode = 1
