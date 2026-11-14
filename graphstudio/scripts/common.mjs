import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const lock = JSON.parse(readFileSync(join(root, 'sources.lock.json'), 'utf8'))
export function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})${capture ? `\n${result.stderr}` : ''}`)
  return result.stdout?.trim()
}
export function treeHash(directory) {
  const hash = createHash('sha256')
  function walk(path, prefix = '') {
    for (const name of readdirSync(path).sort()) {
      if (['node_modules', 'dist', 'generated', '.tools', 'compatibility.json'].includes(name)) continue
      const target = join(path, name), relative = `${prefix}${name}`
      if (statSync(target).isDirectory()) walk(target, `${relative}/`)
      else { hash.update(relative); hash.update('\0'); hash.update(readFileSync(target)); hash.update('\0') }
    }
  }
  walk(directory)
  return hash.digest('hex')
}
export function assertPublicSource(source) {
  const head = run('git', ['rev-parse', 'HEAD'], source, true)
  if (head !== lock.copycat.commit) throw new Error(`Public source must be pinned to ${lock.copycat.commit}; found ${head}`)
  // Include untracked files: a public build must never ingest local development data.
  const changes = run('git', ['status', '--porcelain', '--untracked-files=all'], source, true)
  if (changes) throw new Error('Public source must be clean. Use the internal runner for local development.')
}
