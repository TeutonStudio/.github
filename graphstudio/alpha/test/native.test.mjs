import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { root } from '../../scripts/common.mjs'
import { buildNative, nativeRequest, nativeWorker } from '../../scripts/ccvisual-native.mjs'
import { join, resolve } from 'node:path'
import { edge, extractGroup, makeGroup, newProject, node } from '../src/project.js'

const native=buildNative(process.env.CCVISUAL_SOURCE||resolve(root,'../../CCVisual'))
const apis=JSON.parse(readFileSync(join(root,'adapters/ccvisual/api-catalog.json'),'utf8')).methods
const worker=nativeWorker(native.classpath)
test.after(()=>worker.close())
test('native catalog resolves builtin, dynamic and selected pack nodes',async()=>{
  const catalog=await worker.request({op:'catalog',apis})
  assert.ok(catalog.definitions.length>70)
  assert.ok(catalog.definitions.some(d=>d.id==='peripheral.alpha.create.speed.target.setTargetSpeed'))
  for(const template of ['hello','redstone','counter']){
    const result=await worker.request({op:'compile',project:newProject(template),apis})
    assert.equal(result.valid,true,JSON.stringify(result.diagnostics))
    assert.ok(result.lua.includes('Graphstudio Alpha'))
  }
})
test('native diagnostics reject invalid types, broken Lua and recursive groups',async()=>{
  const p=newProject();p.main.nodes[1].type='unknown.keep-me'
  const unknown=await worker.request({op:'compile',project:p,apis})
  assert.equal(unknown.valid,false);assert.equal(unknown.lua,null);assert.ok(unknown.diagnostics.some(d=>d.nodeId===p.main.nodes[1].id))
  const broken=newProject();broken.main.nodes.at(-1).type='raw.lua';broken.main.nodes.at(-1).params={code:'local = ???'};broken.main.dataConnections=[]
  const syntax=await worker.request({op:'compile',project:broken,apis})
  assert.equal(syntax.valid,false);assert.equal(syntax.diagnostics[0].nodeId,broken.main.nodes.at(-1).id)
  const constant=newProject('counter');constant.main.nodes.find(n=>n.type.startsWith('function.card.')).params['arg.delta']='falsch'
  assert.equal((await worker.request({op:'compile',project:constant,apis})).valid,false)
  const recursive=newProject('counter'),g=recursive.groups[0]
  g.graph.nodes.push(node(`function.card.${g.id}`))
  await assert.rejects(worker.request({op:'compile',project:recursive,apis}),/Zyklus/)
})
test('Lua import preserves comments/source and keeps syntax errors editable',async()=>{
  const source='-- behalten\nlocal value = 3\nprint(value)\n'
  const parsed=await worker.request({op:'parse',source})
  const p=newProject();p.main=parsed.graph
  const result=await worker.request({op:'compile',project:p,apis})
  assert.equal(result.valid,true,JSON.stringify(result.diagnostics));assert.ok(result.lua.includes('-- behalten'))
  const broken=await worker.request({op:'parse',source:'local = !'})
  assert.equal(broken.graph.nodes[0].type,'raw.lua');assert.equal(broken.graph.nodes[0].params.code,'local = !');assert.equal(broken.diagnostics.length,1)
})
test('native Cobalt executes independent state instances and extracted nested groups',async()=>{
  const counter=newProject('counter')
  const compiled=await worker.request({op:'compile',project:counter,apis})
  const defs=new Map(compiled.resolved.main.map(n=>[n.id,n.definition]))
  const call=counter.main.nodes.find(n=>n.type.startsWith('function.card.'))
  const extracted=extractGroup(counter,'main',[call.id],defs,'Geschachtelter Zähler')
  const check='assert(table.concat(log,",") == "1,10,2,20,3,30",table.concat(log,","))'
  const tuple=newProject(),tupleGroup=makeGroup('Tupel')
  tupleGroup.parameters=[];tupleGroup.returns=[0,1,2].map(i=>({id:`return.${i}`,codeName:`result_${i}`,displayName:`Ergebnis ${i+1}`,dataType:'ANY'}))
  tupleGroup.graph.dataConnections=[];tupleGroup.graph.nodes[1].params.rawValues='nil, 7, nil'
  const start=node('control.start'),produce=node(`function.card.${tupleGroup.id}`),consume=node('function.external',{callSymbol:'capture',rawArguments:'nil, nil, nil'})
  tuple.groups=[tupleGroup];tuple.main={nodes:[start,produce,consume],execConnections:[edge(start,'next',produce,'in'),edge(produce,'next',consume,'in')],dataConnections:[0,1,2].map(i=>edge(produce,`return.${i}`,consume,`arg.${i}`))}
  const measurement=newProject(),measureStart=node('control.start'),handle=node('peripheral.wrap',{side:'left'}),read=node('peripheral.alpha.create.speed.read.getSpeed'),printA=node('terminal.print'),printB=node('terminal.print')
  measurement.main={nodes:[measureStart,handle,read,printA,printB],execConnections:[edge(measureStart,'next',read,'in'),edge(read,'next',printA,'in'),edge(printA,'next',printB,'in')],dataConnections:[edge(handle,'handle',read,'handle'),edge(read,'result',printA,'value'),edge(read,'result',printB,'value')]}
  const cases=[{name:'independent state',project:counter,before:'log = {}; print = function(value) log[#log+1] = value end',after:check},{name:'nested extracted state',project:extracted,before:'log = {}; print = function(value) log[#log+1] = value end',after:check},{name:'nil tuple arity',project:tuple,before:'function capture(...) assert(select("#",...) == 3); local a,b,c = ...; assert(a == nil and b == 7 and c == nil); captured = true end',after:'assert(captured == true)'},{name:'one peripheral call two consumers',project:measurement,apis,before:'calls=0; log={}; peripheral={wrap=function() return {getSpeed=function() calls=calls+1; return 42 end} end}; print=function(v) log[#log+1]=v end',after:'assert(calls==1 and log[1]==42 and log[2]==42)'}]
  const output=await new Promise((resolve,reject)=>{
    const p=spawn('java',['-Xmx512m','-cp',native.classpath,'studio.alpha.AlphaBridge','--self-test']);let out='',err=''
    const timer=setTimeout(()=>{p.kill();reject(new Error('Cobalt test timeout'))},15000)
    p.on('error',reject);p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>err+=c);p.on('exit',code=>{clearTimeout(timer);code===0?resolve(out):reject(new Error(err||out))});p.stdin.end(JSON.stringify(cases))
  })
  assert.ok(output.includes('PASS independent state'));assert.ok(output.includes('PASS nested extracted state'))
  assert.ok(output.includes('PASS nil tuple arity'))
  assert.ok(output.includes('PASS one peripheral call two consumers'))
})
