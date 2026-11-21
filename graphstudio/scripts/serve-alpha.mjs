import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { root } from './common.mjs'
import { nativeWorker } from './ccvisual-native.mjs'

const directory=join(root,'.alpha-dist'),manifest=join(root,'.cache/ccvisual-alpha/native.json')
if(!existsSync(join(directory,'index.html'))||!existsSync(manifest))throw new Error('Run npm run alpha first')
const native=JSON.parse(readFileSync(manifest,'utf8')),built=JSON.parse(readFileSync(join(directory,'studio.json'),'utf8'))
if(native.sourceSha256!==built.ccvisual.sourceSha256)throw new Error('Native core and Alpha build differ. Rebuild Alpha.')
const worker=nativeWorker(native.classpath),apis=JSON.parse(readFileSync(join(root,'adapters/ccvisual/api-catalog.json'),'utf8')).methods
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'}
const server=createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}
  const json=(status,data)=>res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(data))
  try {
    if(!['127.0.0.1:4319','localhost:4319'].includes(req.headers.host)){json(403,{error:'Local host required'});return}
    const url=new URL(req.url,`http://${req.headers.host}`)
    if(url.pathname.startsWith('/api/')) {
      if(req.method!=='POST'){json(405,{error:'POST required'});return}
      if(req.headers.origin&&req.headers.origin!==url.origin){json(403,{error:'Same origin required'});return}
      if(!req.headers['content-type']?.startsWith('application/json')){json(415,{error:'JSON required'});return}
      if(!['/api/compile','/api/parse'].includes(url.pathname)){json(404,{error:'Unknown endpoint'});return}
      let bytes=0,chunks=[]
      for await(const chunk of req){bytes+=chunk.length;if(bytes>2_000_000){json(413,{error:'Projekt ist zu groß'});return}chunks.push(chunk)}
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'))
      json(200,await worker.request({...input,op:url.pathname.slice(5),apis}));return
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
    let file=resolve(directory,`.${decodeURIComponent(url.pathname)}`)
    if(file!==directory&&!file.startsWith(directory+sep)){res.writeHead(403).end();return}
    if(existsSync(file)&&statSync(file).isDirectory())file=join(file,'index.html')
    if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return}
    res.writeHead(200,{...headers,'Content-Type':types[extname(file)]||'application/octet-stream'})
    if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res)
  }catch(error){if(!res.headersSent)json(400,{error:error.message});else res.end()}
})
server.listen(4319,'127.0.0.1',()=>console.log('Graphstudio Alpha: http://127.0.0.1:4319/'))
const close=()=>{worker.close();server.close();process.exit()}
process.once('SIGINT',close);process.once('SIGTERM',close)
