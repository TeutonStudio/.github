import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { spawnSync, spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { root } from './common.mjs'

const graphFiles=['GraphModel','GraphValidator','NodeTypes','StandardNodes','MathNodes','CopycatNodes','LuaCodeGenerator','LuaGraphParser','LuaNodeSource','Snippets']
const coordinates=[
  ['org.jetbrains.kotlin','kotlin-compiler-embeddable','2.3.0'],['org.jetbrains.kotlin','kotlin-stdlib','2.3.0'],
  ['org.jetbrains.kotlin','kotlin-script-runtime','2.3.0'],['org.jetbrains.kotlin','kotlin-daemon-embeddable','2.3.0'],
  ['org.jetbrains.kotlin','kotlin-reflect','1.6.10'],['org.jetbrains.kotlinx','kotlinx-coroutines-core-jvm','1.8.0'],
  ['org.jetbrains','annotations','13.0'],['cc.tweaked','cobalt','0.9.9'],['com.google.code.gson','gson','2.11.0']
]
function dependencies() {
  const cache=join(process.env.GRADLE_USER_HOME || join(homedir(),'.gradle'),'caches/modules-2/files-2.1')
  return coordinates.map(([group,name,version])=>{
    const directory=join(cache,group,name,version), filename=`${name}-${version}.jar`
    const path=existsSync(directory) ? readdirSync(directory).map(hash=>join(directory,hash,filename)).find(existsSync) : undefined
    if(!path) throw new Error(`CCVisual compiler dependency missing: ${group}:${name}:${version}. Resolve the CCVisual Gradle dependencies first.`)
    return path
  })
}
export function buildNative(source) {
  source=resolve(source)
  const base=join(source,'src/main/kotlin/dev/teutonstudio/ccvisual')
  const files=graphFiles.map(name=>[`${name}.kt`,readFileSync(join(base,'graph',`${name}.kt`),'utf8')])
  const cards=readFileSync(join(base,'graph/FunctionCards.kt'),'utf8')
  const start=cards.indexOf('data class FunctionSocket('), end=cards.indexOf('\nobject FunctionCardNames')
  if(start<0||end<start) throw new Error('CCVisual function DTO contract changed; update the bridge extraction')
  files.push(['FunctionTypes.kt',`package dev.teutonstudio.ccvisual.graph\nimport java.util.UUID\n${cards.slice(start,end)}\n`],
    ['LuaSource.kt',readFileSync(join(base,'project/LuaSource.kt'),'utf8')],
    ['AlphaBridge.kt',readFileSync(join(root,'adapters/ccvisual/native/AlphaBridge.kt'),'utf8')])
  const hash=createHash('sha256')
  for(const [name,content] of files) hash.update(name+'\0'+content+'\0')
  const resources=join(source,'src/main/resources')
  for(const name of ['math.lua','copycat.lua']) hash.update(readFileSync(join(resources,'assets/ccvisual/lua',name)))
  const fingerprint=hash.digest('hex'), cache=join(root,'.cache/ccvisual-alpha'), snapshot=join(cache,'src'), classes=join(cache,'classes')
  mkdirSync(snapshot,{recursive:true})
  const deps=dependencies(), classpath=[classes,...deps].join(delimiter)
  const manifest=join(cache,'native.json')
  if(!existsSync(manifest)||JSON.parse(readFileSync(manifest,'utf8')).sourceSha256!==fingerprint||!existsSync(join(classes,'studio/alpha/AlphaBridge.class'))) {
    rmSync(classes,{recursive:true,force:true});mkdirSync(classes,{recursive:true})
    for(const [name,content] of files) writeFileSync(join(snapshot,name),content)
    const args=['-Xmx768m','-cp',deps.join(delimiter),'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-jvm-target','21','-classpath',deps.join(delimiter),'-d',classes,...files.map(([name])=>join(snapshot,name))]
    const result=spawnSync('java',args,{encoding:'utf8'})
    if(result.status!==0) throw new Error(`CCVisual native compiler build failed\n${result.stdout}\n${result.stderr}`)
    cpSync(join(resources,'assets/ccvisual/lua'),join(classes,'assets/ccvisual/lua'),{recursive:true})
  }
  const metadata={schema:1,sourceSha256:fingerprint,source,compiler:'Kotlin 2.3.0',lua:'Cobalt 0.9.9',semanticCore:'CCVisual source snapshot',builtAt:new Date().toISOString()}
  writeFileSync(manifest,JSON.stringify({...metadata,classpath},null,2)+'\n')
  return {...metadata,classpath}
}
export async function nativeRequest(classpath,request) {
  const worker=nativeWorker(classpath)
  try{return await worker.request(request)}finally{worker.close()}
}
export function nativeWorker(classpath) {
  const child=spawn('java',['-Xmx512m','-cp',classpath,'studio.alpha.AlphaBridge'],{stdio:['pipe','pipe','pipe']})
  let pending=[], active=null, stopped=false
  const fail=error=>{stopped=true;if(active){clearTimeout(active.timer);active.reject(error);active=null}for(const job of pending)job.reject(error);pending=[]}
  const pump=()=>{if(stopped||active||!pending.length)return;active=pending.shift();active.timer=setTimeout(()=>{fail(new Error('Native Prüfung hat das Zeitlimit überschritten'));child.kill()},15000);child.stdin.write(JSON.stringify(active.input)+'\n')}
  createInterface({input:child.stdout}).on('line',line=>{
    if(!active)return
    const current=active;clearTimeout(current.timer);active=null
    try{const response=JSON.parse(line);if(response.ok)current.resolve(response.result);else current.reject(new Error(response.error))}catch(e){current.reject(e)}pump()
  })
  child.on('error',fail);child.on('exit',()=>fail(new Error('Native CCVisual-Prüfung ist beendet')))
  child.stderr.on('data',data=>process.stderr.write(data))
  return {request(input){return new Promise((resolve,reject)=>{if(stopped)return reject(new Error('Native Prüfung nicht verfügbar; Vorschau neu starten'));if(pending.length>=8)return reject(new Error('Zu viele gleichzeitige Prüfungen'));pending.push({input,resolve,reject});pump()})},close(){fail(new Error('Vorschau beendet'));child.kill()}}
}
