import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, run, treeHash } from './common.mjs'
const args=process.argv.slice(2), paths={}
for(let i=0;i<args.length;i+=2) {
  if(!['--copycat','--local'].includes(args[i]) || !args[i+1]) throw new Error('Usage: npm run internal -- --copycat /development-core [--local /local-mod]')
  paths[args[i].slice(2)]=resolve(args[i+1])
}
if(!paths.copycat) throw new Error('Specify the development core with --copycat. Public builds still require the clean published source pin.')
const source=paths.copycat, development=join(root,'.cache/copycat-development'), web=join(development,'web'), adapter=join(root,'adapters/copycat/web'), output=join(root,'.internal-dist')
if(!existsSync(join(source,'gradlew'))) throw new Error('No native Copycat checkout')
const before=treeHash(join(source,'src/main')), adapterBefore=treeHash(adapter)
mkdirSync(web,{recursive:true})
// The organization adapter is a build overlay, never a second editor in the mod checkout.
for(const name of ['src','examples','docs','build','LICENSE']) {
 const link=join(development,name)
 rmSync(link,{force:true,recursive:true})
 symlinkSync(join(source,name),link,name==='LICENSE'?'file':'dir')
}
for(const name of ['src','test','kotlin','public','tools']) rmSync(join(web,name),{recursive:true,force:true})
cpSync(adapter,web,{recursive:true,filter:path=>!['node_modules','dist','.tools','generated'].includes(path.split('/').at(-1))})
run('./gradlew',['test','--tests','*GraphstudioExchangeTest.nativeCorpus','--tests','*CopycatTransformContractTest','--tests','*CopycatParameterPreviewTest','--offline','--rerun'],source)
const coreChecks=report(source)
// Honour dependency/lock changes even when reusing the development overlay.
run('npm',['ci','--no-audit','--no-fund'],web)
run('npm',['test'],web)
run('./gradlew',['test','--tests','*GraphstudioExchangeTest.browserExports','--offline','--rerun'],source)
function report(path) {
 const totals={tests:0,failures:0,errors:0,skipped:0}
 for(const file of readdirSync(join(path,'build/test-results/test')).filter(f=>f.endsWith('.xml'))) {
  const header=readFileSync(join(path,'build/test-results/test',file),'utf8').match(/<testsuite\b[^>]*>/)?.[0] || ''
  for(const key of Object.keys(totals)) totals[key]+=Number(header.match(new RegExp(`\\b${key}="(\\d+)"`))?.[1] || 0)
 }
 if(!totals.tests || totals.failures || totals.errors || totals.skipped) throw new Error('Mandatory native checks must pass without skipped cases')
 return totals
}
const native={core:coreChecks,browserExports:report(source)}
if(paths.local) {
 const exchange=join(source,'build/graphstudio-exchange')
 const old=process.env.GRAPHSTUDIO_EXCHANGE;process.env.GRAPHSTUDIO_EXCHANGE=exchange
 run('./gradlew',['test','--tests','*GraphstudioExchangeBridgeTest','--tests','*CopycatTransformContractTest','--tests','*CopycatParameterPreviewTest','--offline','--rerun'],paths.local)
 process.env.GRAPHSTUDIO_EXCHANGE=old
 report(paths.local)
 run('node',['tools/local-exchange.mjs',exchange],web)
 run('./gradlew',['test','--tests','*GraphstudioExchangeTest.localBrowserExports','--offline','--rerun'],source)
 report(source)
}
process.env.VITE_STUDIO_CHANNEL='internal'
run('npm',['run','build'],web)
if(before!==treeHash(join(source,'src/main')) || adapterBefore!==treeHash(adapter)) throw new Error('Core or adapter sources changed during the checks; repeat verification')
rmSync(output,{recursive:true,force:true});cpSync(join(root,'shell'),output,{recursive:true});cpSync(join(web,'dist'),join(output,'copycat'),{recursive:true})
const compatibility=JSON.parse(readFileSync(join(web,'dist/compatibility.json'),'utf8'))
const entry={id:'copycat',name:'Copycat Architect',status:'internal-development',url:'./copycat/',sourceCommit:run('git',['rev-parse','HEAD'],source,true),sourceSha256:before,adapterSha256:treeHash(adapter),workingTree:run('git',['status','--porcelain'],source,true)?'modified':'clean',checks:{native,browser:'passed',browserExportsInJvm:'passed',localJvm:paths.local?'passed':'not-requested'},compatibility,note:'Organisationseditor mit unveröffentlichtem Entwicklungsfachkern. Keine Freigabe für den öffentlichen Kanal.'}
writeFileSync(join(output,'studio.json'),JSON.stringify({schema:1,channel:'internal',builtAt:new Date().toISOString(),adapters:[entry]},null,2)+'\n')
console.log(`Internal Graphstudio: ${output}. No deployment or public pin changed.`)
