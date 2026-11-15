import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { root } from './common.mjs'

const args = process.argv.slice(2)
if (args.some(arg => arg !== '--internal')) throw new Error('Usage: npm run preview -- [--internal]')
const internal = args.includes('--internal')
const directory = join(root, internal ? '.internal-dist' : 'dist')
const port = internal ? 4318 : 4317
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
if (!existsSync(join(directory, 'index.html'))) throw new Error(`Build ${internal ? 'internal' : 'public'} Graphstudio first`)
const server = createServer((request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let file = resolve(directory, `.${path}`)
    if (file !== directory && !file.startsWith(directory + sep)) { response.writeHead(403).end(); return }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file) || !statSync(file).isFile()) { response.writeHead(404).end(); return }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    createReadStream(file).pipe(response)
  } catch { response.writeHead(400).end() }
})
server.listen(port, '127.0.0.1', () => console.log(`Graphstudio ${internal ? 'internal' : 'public'}: http://127.0.0.1:${port}/`))
