import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, lock, run, assertPublicSource, treeHash } from './common.mjs'

const args = process.argv.slice(2)
if (args.length && !(args.length === 2 && args[0] === '--source')) throw new Error('Usage: npm run build -- [--source /clean/pinned/public/checkout]')
const cache = join(root, '.cache')
mkdirSync(cache, { recursive: true })
const source = args.length ? resolve(args[1]) : join(cache, 'copycat-source')
if (!existsSync(source)) {
  if (args.length) throw new Error('Source checkout does not exist')
  run('git', ['init', source], root)
  run('git', ['-C', source, 'fetch', '--depth', '1', lock.copycat.repository, lock.copycat.commit], root)
  run('git', ['-C', source, 'checkout', '--detach', 'FETCH_HEAD'], root)
}
assertPublicSource(source)
const work = join(cache, 'copycat-build'), web = join(work, 'web')
// Keep compiler/npm caches, replace all inputs from the pinned public commit.
mkdirSync(work, { recursive: true })
const publicInputs = ['src', 'examples', 'docs', 'gradle', 'gradlew', 'gradlew.bat', 'settings.gradle.kts', 'build.gradle.kts', 'gradle.properties', 'LICENSE']
for (const name of publicInputs) {
  rmSync(join(work, name), { recursive: true, force: true })
}
// git archive contains committed files only, including when the source checkout
// contains ignored local data. Never recursively copy an external working tree.
const archive = join(cache, 'copycat-public.tar')
run('git', ['archive', '--format=tar', '--output', archive, lock.copycat.commit, ...publicInputs], source)
run('tar', ['-xf', archive, '-C', work], root)
rmSync(archive)
const adapter = join(root, 'adapters/copycat/web')
// Do not let removed adapter files survive a rebuild.
for (const name of ['src', 'test', 'kotlin', 'public', 'tools']) rmSync(join(web, name), { recursive: true, force: true })
cpSync(adapter, web, { recursive: true, filter: path => !['node_modules', 'dist', '.tools', 'generated'].includes(path.split('/').at(-1)) })
run('npm', ['ci', '--no-audit', '--no-fund'], web)
run('./gradlew', ['test'], work)
run('npm', ['test'], web)
run('./gradlew', ['test', '--tests', '*GraphstudioExchangeTest.browserExports', '--rerun'], work)
const exchangeReport = readFileSync(join(work, 'build/test-results/test/TEST-de.teutonstudio.copycatarchitect.GraphstudioExchangeTest.xml'), 'utf8')
const suite = exchangeReport.match(/<testsuite\b[^>]*>/)?.[0] || ''
for (const key of ['failures', 'errors', 'skipped']) {
  if (!new RegExp(`\\b${key}="0"`).test(suite)) throw new Error('JVM exchange verification must pass without skipped cases')
}
if (!exchangeReport.includes('browserExports()')) throw new Error('JVM browser export verification was not executed')
const nativeCorpus = JSON.parse(readFileSync(join(work, 'build/graphstudio-exchange/native.json'), 'utf8'))
const browserCorpus = JSON.parse(readFileSync(join(work, 'build/graphstudio-exchange/browser.json'), 'utf8'))
if (!nativeCorpus.cases.length || nativeCorpus.cases.length !== browserCorpus.cases.length) throw new Error('Incomplete exchange corpus')
run('npm', ['run', 'build'], web)
const compatibility = JSON.parse(readFileSync(join(web, 'dist/compatibility.json'), 'utf8'))
if (compatibility.release !== lock.copycat.version) throw new Error('Adapter release and public source lock differ')
const output = join(root, 'dist')
// Publish only the shell and the successful public adapter output.
rmSync(output, { recursive: true, force: true })
cpSync(join(root, 'shell'), output, { recursive: true })
cpSync(join(root, '../docs/GRAPHSTUDIO.md'), join(output, 'plan.md'))
cpSync(join(web, 'dist'), join(output, 'copycat'), { recursive: true })
writeFileSync(join(output, 'studio.json'), JSON.stringify({
  schema: 1, channel: 'public', builtAt: new Date().toISOString(),
  adapters: [
    { id: 'copycat', name: 'Copycat Architect', status: 'source-verified', url: './copycat/',
      version: compatibility.release, sourceCommit: lock.copycat.commit,
      sourceRepository: lock.copycat.repository, adapterSha256: treeHash(adapter),
      checks: { nativeCorpus: 'passed', browserTests: 'passed', browserExportsInJvm: 'passed' },
      exchangeCases: nativeCorpus.cases.length,
      compatibility, binaryReleaseTested: false },
    { id: 'ccvisual', name: 'CC Visual', status: 'planned', checks: {},
      note: 'Der Browseradapter folgt dem Umbauplan. Native Tests sind im internen Studio aufrufbar.' }
  ]
}, null, 2) + '\n')
console.log(`Public Graphstudio built: ${output}`)
