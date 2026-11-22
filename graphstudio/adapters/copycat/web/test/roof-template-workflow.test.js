import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {newNode,previewGraph} from '../src/generated/engine.mjs'
import {inspect,editNode,applyWires,connections,writeGraph,readGraph} from '../src/model.js'
import {referenceVersions} from '../src/reference-versions.js'
const original=JSON.parse(readFileSync(new URL('./fixtures/testdach-building.json',import.meta.url)))
const library={forms:{},modules:{}}
for(const definition of Object.values(original.graph.graphDefinitions)){Object.assign(library.forms,definition.forms);Object.assign(library.modules,definition.modules)}
const n=(kind,id,extra={})=>({...newNode(true,kind,id,0,0,true),...extra})
function sample(size,draw=false){let d=structuredClone(original);d.graph.nodes.push(n('AREA','sample',{areaMode:draw?'DRAW':'SQUARE',length:size,height:size,coordinates:Array.from({length:size*size},(_,i)=>({x:i%size,y:0,z:Math.floor(i/size)}))}));return editNode('building',d,{...d.graph.nodes.find(n=>n.id==='result'),geometry:'sample'})}
for(const size of [5,6])for(const draw of [false,true])test(`submitted Testdach previews its complete ${draw?'drawn':'square'} area ${size}`,()=>{
 const d=sample(size,draw),plan=previewGraph(true,d,library,'')
 assert.ok(plan.count>0);assert.ok(plan.meshes.length>0)
 const restored=readGraph(writeGraph('building',d),'building')
 assert.deepEqual(previewGraph(true,restored,library,''),plan)
 const template={...d.graph.nodes.find(n=>n.id==='result'),id:'template',kind:'ROOF_TEMPLATE',resultType:null,resultMode:null,producerKind:null}
 const result=n('RESULT','result',{resultType:'ROOF',resultMode:'CONSTRUCT',producerKind:'ROOF',geometry:'sample',roofTemplate:'template',roofInputMode:'TEMPLATE',role:'roof',inlinePart:null})
 const consumed={...d,graph:{...d.graph,nodes:d.graph.nodes.filter(n=>n.id!=='result').concat(template,result)}}
 assert.deepEqual(previewGraph(true,consumed,library,'').meshes,plan.meshes)
})
test('legacy slots retain their IDs and a new optional slot can be connected directly',()=>{
 let d=sample(5),rows=inspect('building',d),result=rows.find(e=>e.node.id==='result')
 assert.deepEqual(result.ports.map(p=>p.id),[...Array.from({length:13},(_,i)=>`in:${i}`),'geometry'])
 assert.equal(result.ports.at(-1).source,'sample')
 d=applyWires('building',d,rows,[...connections(rows),{source:'copycat_7df11fee-d44b',target:'result',port:'in:9'}])
 assert.equal(d.graph.nodes.find(n=>n.id==='result').inputs[9],'copycat_7df11fee-d44b')
})
test('version options combine saved versions with an imported frozen current definition',()=>{
 const node={referenceKey:'identity@1',libraryReference:{documentId:'identity',version:1}}
 const document={graph:{graphDefinitions:{'identity@1':{document:{name:'Original',graph:{nodes:[]}}}}}}
 const options=referenceVersions(node,document,{}, {graphs:[{id:'v2',documentId:'identity',version:2,name:'Update'},{id:'other',documentId:'other',version:3}],nodeGroups:[]})
 assert.deepEqual(options.map(e=>e.version),[2,1]);assert.equal(options[1].document.name,'Original')
})

test('submitted Testdach also covers a concave custom area',()=>{
 let d=sample(5,true)
 d=editNode('building',d,{...d.graph.nodes.find(n=>n.id==='sample'),coordinates:d.graph.nodes.find(n=>n.id==='sample').coordinates.filter(p=>p.x<3 || p.z<3)})
 assert.ok(previewGraph(true,d,library,'').count>0)
})

test('a completed submitted template has an automatic sample preview without a preview-area connection',()=>{
 const plan=previewGraph(true,original,library,'')
 assert.ok(plan.count>0);assert.ok(plan.warnings.some(message=>message.includes('5 × 5')))
})
