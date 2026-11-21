import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { root, run, treeHash } from './common.mjs'
import { buildNative, nativeRequest } from './ccvisual-native.mjs'

const args=process.argv.slice(2),options={ccvisual:resolve(root,'../../CCVisual'),copycat:join(root,'.cache/copycat-development')}
for(let i=0;i<args.length;i+=2){if(!['--ccvisual','--copycat'].includes(args[i])||!args[i+1])throw new Error('Usage: npm run alpha -- [--ccvisual /CCVisual] [--copycat /Copycat-core]');options[args[i].slice(2)]=resolve(args[i+1])}
const output=join(root,'.alpha-dist'),native=buildNative(options.ccvisual),apis=JSON.parse(readFileSync(join(root,'adapters/ccvisual/api-catalog.json'),'utf8')).methods
const catalog=await nativeRequest(native.classpath,{op:'catalog',apis})
const app=join(root,'alpha')
if(!existsSync(join(app,'node_modules/vite')))run('npm',['ci','--no-audit','--no-fund'],app)
run('npm',['run','build'],app)
// Build in an organization-owned overlay. Neither the mod editor nor its deployment is written.
const overlay=join(root,'.cache/alpha-copycat'),web=join(overlay,'web'),adapter=join(root,'adapters/copycat/web')
if(!existsSync(join(options.copycat,'src/main/kotlin/de/teutonstudio/copycatarchitect/domain')))throw new Error('Specify a compatible Copycat core with --copycat; the old mod checkout is only read.')
const coreBefore=treeHash(join(options.copycat,'src/main')),adapterBefore=treeHash(adapter)
mkdirSync(overlay,{recursive:true})
for(const name of ['src','examples','docs','LICENSE']){const link=join(overlay,name);rmSync(link,{recursive:true,force:true});symlinkSync(join(options.copycat,name),link,name==='LICENSE'?'file':'dir')}
mkdirSync(web,{recursive:true})
for(const name of ['src','test','kotlin','public','tools'])rmSync(join(web,name),{recursive:true,force:true})
cpSync(adapter,web,{recursive:true,filter:path=>!['node_modules','dist','.tools','generated'].includes(path.split('/').at(-1))})
// Reuse the already installed identical dependency tree and compiler cache, when available.
const previousWeb=join(root,'.cache/copycat-development/web')
for(const name of ['node_modules','.tools'])if(!existsSync(join(web,name))&&existsSync(join(previousWeb,name))&&(name!== 'node_modules'||readFileSync(join(web,'package-lock.json'),'utf8')===readFileSync(join(previousWeb,'package-lock.json'),'utf8')))symlinkSync(join(previousWeb,name),join(web,name),'dir')
if(!existsSync(join(web,'node_modules/vite')))run('npm',['ci','--no-audit','--no-fund'],web)
run('npm',['run','build'],web)
if(coreBefore!==treeHash(join(options.copycat,'src/main'))||adapterBefore!==treeHash(adapter))throw new Error('Copycat sources changed during the Alpha build; repeat the build.')
const compatibility=JSON.parse(readFileSync(join(web,'dist/compatibility.json'),'utf8'))
const inventory=JSON.parse(readFileSync(join(root,'reports/cc-integration-inventory-2026-11-20.json'),'utf8'))
const pack={schema:1,date:inventory.date,lockedArtifacts:inventory.locked_artifacts,scannedArtifacts:inventory.scanned_locked_artifacts,missingArtifacts:inventory.unscanned_locked_artifacts,lockSha256:inventory.source_lock_sha256,
  providers:inventory.records.map(r=>({file:r.container_filename,artifact:r.artifact,mods:r.container_mods,ccClasses:r.classes_with_cc_references.length,luaResources:r.lua_resources.length,notes:r.supplemental_evidence,hashMatches:r.container_matches_lock}))}
rmSync(output,{recursive:true,force:true});cpSync(join(app,'dist'),output,{recursive:true});cpSync(join(web,'dist'),join(output,'copycat'),{recursive:true})
writeFileSync(join(output,'catalog.json'),JSON.stringify(catalog))
writeFileSync(join(output,'pack.json'),JSON.stringify(pack))
writeFileSync(join(output,'studio.json'),JSON.stringify({schema:2,channel:'alpha-local',alphaSourceSha256:treeHash(app),version:'0.2.0-alpha.1',builtAt:new Date().toISOString(),ccvisual:{...native,classpath:undefined,source:undefined},copycat:{compatibility,adapterSha256:adapterBefore,sourceSha256:coreBefore,runtimeTested:false},pack:{lockSha256:pack.lockSha256},limitations:['Lokale JVM-Bridge für Lua-Prüfung und Export erforderlich','12 ausgewählte API-Methoden; vollständiger Packvertrag noch in Arbeit','Keine Ingame-/Multiplayerfreigabe']},null,2)+'\n')
console.log(`Graphstudio Alpha built: ${output}\nStart: npm run preview:alpha`)
