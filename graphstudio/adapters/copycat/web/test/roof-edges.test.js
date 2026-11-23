import {readFileSync} from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {sample} from './fixtures/dormer-fixture.js'
import {roofEdgeModel,previewGraph,wireModels,newNode} from '../src/generated/engine.mjs'
import {replaceNodes,editNode,inspect,applyWires,connections,writeGraph,readGraph} from '../src/model.js'
import {roofEdgeSettings,roofEdgeModeChoices,retainsRoofEdgeSource} from '../src/roof-edge-settings.js'
import {choiceIcon,iconPaths} from '../src/choice-icons.js'
const library={forms:{},modules:{}}
function fixture(template=false){
 let d=sample({template})
 d=replaceNodes(d,d.graph.nodes.map(n=>n.id==='area'?{...n,length:8,height:10}:n.id==='wall_area'?{...n,areaMode:'RECTANGLE',length:2,height:2}:n.id==='wall'?{...n,length:2,height:9}:n))
 const model=roofEdgeModel(d,library,'result'),result=d.graph.nodes.find(n=>n.id==='result')
 return editNode('building',d,{...result,roofEdges:model.edges.map(e=>({id:e.id,mode:e.direction%2===0?'FACADE':'ROOF',source:e.direction%2===0?'wall':''}))})
}
test('both icon choices map to native edge modes',()=>{
 assert.deepEqual(wireModels().enums.RoofEdgeMode,roofEdgeModeChoices.map(([v])=>v))
 const icons=roofEdgeModeChoices.map(([v])=>choiceIcon('RoofEdgeMode',v)?.kind)
 assert.equal(new Set(icons).size,2);for(const icon of icons)assert.ok(iconPaths[icon])
})
for(const template of [false,true])test(`facade heights use their evaluated segment and ${template?'template':'segment'} roof survives JSON roundtrip`,()=>{
 const d=fixture(template),model=roofEdgeModel(d,library,'result')
 assert.equal(d.graph.schema,18);assert.deepEqual(model.edges.map(e=>e.length),[8,10,8,10])
 assert.ok(model.edges.filter(e=>e.mode==='FACADE').every(e=>e.height===2&&!e.message))
 const plan=previewGraph(true,d,library,'');assert.ok(plan.count>0)
 const restored=readGraph(writeGraph('building',d),'building')
 assert.deepEqual(previewGraph(true,restored,library,''),plan)
 assert.deepEqual(d.graph.nodes.find(n=>n.id==='template'),sample({template}).graph.nodes.find(n=>n.id==='template'))
})
test('edge sockets disconnect and change mode using stable geometric identities',()=>{
 let d=fixture(),rows=inspect('building',d),ports=rows.find(r=>r.node.id==='result').ports.filter(p=>p.id.startsWith('semantic:roofEdge:'))
 assert.equal(ports.length,2)
 d=applyWires('building',d,rows,connections(rows).filter(w=>w.port!==ports[0].id))
 let result=d.graph.nodes.find(n=>n.id==='result'),model=roofEdgeModel(d,library,'result'),first=model.edges[0]
 assert.equal(result.roofEdges.find(e=>e.id===first.id).source,'')
 assert.match(model.edges[0].message,/anschließen/)
 const patch=roofEdgeSettings(result,model,first.id,{mode:'ROOF'})
 d=editNode('building',d,{...result,...patch})
 assert.equal(inspect('building',d).find(r=>r.node.id==='result').ports.filter(p=>p.id.startsWith('semantic:roofEdge:')).length,1)
 result=d.graph.nodes.find(n=>n.id==='result');assert.equal(result.roofEdges.find(e=>e.id===model.edges[2].id).source,'wall')
})
test('outline changes expose new runs without silently assigning an old facade to them',()=>{
 let d=fixture(),area=d.graph.nodes.find(n=>n.id==='area')
 const coordinates=Array.from({length:7},(_,z)=>Array.from({length:z>=2&&z<=4?5:3},(_,i)=>({x:i-(z>=2&&z<=4?1:0),y:0,z}))).flat()
 d=editNode('building',d,{...area,areaMode:'DRAW',coordinates})
 const m=roofEdgeModel(d,library,'result');assert.equal(m.edges.length,12)
 assert.ok(m.edges.filter(e=>!d.graph.nodes.find(n=>n.id==='result').roofEdges.some(old=>old.id===e.id)).every(e=>e.mode==='ROOF'))
})
test('edge worker returns model diagnostics and revision ids without generating a mesh',async()=>{
 const sent=[],oldSelf=globalThis.self;globalThis.self={postMessage:data=>sent.push(data)}
 try{
   await import(`../src/roof-edges.worker.js?test=${Date.now()}`)
   assert.equal(sent[0].action,'ready')
   self.onmessage({data:{request:9,document:fixture(),library,id:'result'}})
   assert.equal(sent.at(-1).request,9);assert.equal(sent.at(-1).model.edges.length,4)
   assert.ok(!('meshes' in sent.at(-1).model))
 }finally{globalThis.self=oldSelf}
})

test('dormant facade sources survive a roof switch without a false disconnected-wire warning',()=>{
 let d=fixture(),r=d.graph.nodes.find(n=>n.id==='result'),m=roofEdgeModel(d,library,'result'),edge=m.edges[0]
 const wire={source:'wall',target:'result',port:`semantic:roofEdge:${edge.id}:source`}
 d=editNode('building',d,{...r,...roofEdgeSettings(r,m,edge.id,{mode:'ROOF'})})
 assert.equal(d.graph.nodes.find(n=>n.id==='result').roofEdges.find(e=>e.id===edge.id).source,'wall')
 assert.ok(retainsRoofEdgeSource(d,wire))
 r=d.graph.nodes.find(n=>n.id==='result');m=roofEdgeModel(d,library,'result')
 d=editNode('building',d,{...r,...roofEdgeSettings(r,m,edge.id,{mode:'FACADE'})})
 assert.ok(connections(inspect('building',d)).some(w=>w.port===wire.port&&w.source==='wall'))
})

test('a translated facade segment keeps its actual height and wall coverage',()=>{
 let d=fixture(),result=d.graph.nodes.find(n=>n.id==='result')
 const shifted={id:'shift',kind:'POSITION',translation:{x:-3,y:5,z:-2}},moved={id:'moved',kind:'SEGMENT_OPERATOR',operation:'TRANSLATE',inputs:['wall','shift']}
 const original=previewGraph(true,d,library,'')
 d=replaceNodes(d,d.graph.nodes.concat(shifted,moved).map(n=>n.id==='result'?{...n,roofEdges:n.roofEdges.map(e=>e.mode==='FACADE'?{...e,source:'moved'}:e)}:n))
 const model=roofEdgeModel(d,library,'result');assert.ok(model.edges.filter(e=>e.mode==='FACADE').every(e=>e.height===2&&!e.message))
 const actual=previewGraph(true,d,library,'')
 assert.equal(actual.raw,original.raw);assert.equal(actual.count,original.count)
})

test('original Testdach template fits a gable capped by independent facade segments',()=>{
 const original=JSON.parse(readFileSync(new URL('./fixtures/testdach-building.json',import.meta.url),'utf8'))
 const definitions=Object.values(original.graph.graphDefinitions||{}),lib={forms:{},modules:{}}
 for(const d of definitions){Object.assign(lib.forms,d.forms||{});Object.assign(lib.modules,d.modules||{})}
 const old=original.graph.nodes.find(n=>n.id==='result')
 const template={...old,id:'edge_template',kind:'ROOF_TEMPLATE',resultType:null,resultMode:null,producerKind:null,geometry:'',roofInputMode:null,roofSettings:{...old.roofSettings,overhang16:0}}
 const node=(kind,id,patch)=>({...newNode(true,kind,id,0,0,true),...patch})
 const area=node('AREA','edge_area',{areaMode:'RECTANGLE',length:6,height:8})
 const copy=node('COPYCAT','edge_wall_copy',{inlinePart:{source:'copycats:copycat_block'}})
 const wallArea=node('AREA','edge_wall_area',{areaMode:'RECTANGLE',length:1,height:1})
 const wall=node('SEGMENT','edge_wall',{module:'',assembly:true,layout:wallArea.id,inputs:[copy.id],length:1,height:1,depth:1})
 const result=node('RESULT','result',{resultType:'ROOF',resultMode:'CONSTRUCT',producerKind:'ROOF',inlinePart:null,roofInputMode:'TEMPLATE',roofTemplate:template.id,geometry:area.id})
 let d=replaceNodes(original,original.graph.nodes.filter(n=>n.id!=='result').concat(template,area,copy,wallArea,wall,result))
 const m=roofEdgeModel(d,lib,'result')
 d=editNode('building',d,{...d.graph.nodes.find(n=>n.id==='result'),roofEdges:m.edges.map(e=>({id:e.id,mode:e.direction%2===0?'FACADE':'ROOF',source:e.direction%2===0?wall.id:''}))})
 const plan=previewGraph(true,d,lib,'')
 assert.ok(plan.count>0);assert.equal(d.graph.schema,18)
 assert.ok(plan.meshes.flatMap(mesh=>mesh.positions||[]).every(([x,y,z])=>x>=0&&x<6&&z>=0&&z<8))
 assert.deepEqual(d.graph.nodes.find(n=>n.id===template.id),template)
})
