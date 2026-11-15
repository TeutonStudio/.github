import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { root, lock, assertPublicSource, treeHash } from '../scripts/common.mjs'

test('public build rejects arbitrary development revisions and untracked private files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'graphstudio-contract-'))
  try {
    const git = args => { const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim() }
    git(['init', '-q'])
    writeFileSync(join(directory, 'public.txt'), 'public')
    git(['add', 'public.txt'])
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture'])
    assert.throws(() => assertPublicSource(directory), /must be pinned/)
    const previous = lock.copycat.commit
    try {
      lock.copycat.commit = git(['rev-parse', 'HEAD'])
      assert.doesNotThrow(() => assertPublicSource(directory))
      writeFileSync(join(directory, 'private.json'), '{"internal":true}')
      assert.throws(() => assertPublicSource(directory), /must be clean/)
      rmSync(join(directory, 'private.json'))
      writeFileSync(join(directory, 'public.txt'), 'local development')
      assert.throws(() => assertPublicSource(directory), /must be clean/)
    } finally { lock.copycat.commit = previous }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('adapter fingerprint changes when browser sources change', () => {
  const directory = mkdtempSync(join(tmpdir(), 'graphstudio-hash-'))
  try {
    writeFileSync(join(directory, 'adapter.js'), 'first')
    const before = treeHash(directory)
    writeFileSync(join(directory, 'adapter.js'), 'second')
    assert.notEqual(treeHash(directory), before)
    assert.equal(treeHash(directory), treeHash(directory))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('only public build directory is uploaded by Pages workflow', () => {
  const workflow = readFileSync(join(root, '../.github/workflows/graphstudio.yml'), 'utf8')
  assert.equal((workflow.match(/path: graphstudio\/dist/g) || []).length, 2)
  assert.ok(!workflow.includes('.internal-dist'))
  assert.ok(!workflow.includes('npm run internal'))
  const ignored = readFileSync(join(root, '../.gitignore'), 'utf8')
  assert.ok(ignored.includes('graphstudio/.internal-dist/'))
  assert.ok(ignored.includes('graphstudio/.cache/'))
})
