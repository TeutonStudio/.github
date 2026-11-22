import {sample} from './fixtures/dormer-fixture.js'
import {insertSavedReference} from '../src/reference-groups.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {newNode,roofDormerModel,checkRoofDormerPlacement,releaseRoofDormerModel,previewGraph} from '../src/generated/engine.mjs'
import {newCard} from '../src/cards.js'
import {replaceNodes,editNode,inspect,connections,applyWires,readGraph,writeGraph} from '../src/model.js'
import {dormerPatch,replaceDormer,dormerHost} from '../src/dormer-placement.js'
import {choiceIcon,iconPaths} from '../src/choice-icons.js'
const library={forms:{},modules:{}}
const item=(id='first',x=3,z=0,direction=0)=>({id,source:'dormer',position:{x,y:0,z},direction,openCeiling:false})
for(const template of [false,true])for(const contour of ['BOUNDS','CONTOUR'])test(`modern ${template?'template':'segment'} ${contour} roof inserts a dormer and roundtrips`,()=>{
 const original=sample({template,contour}),result=original.graph.nodes.find(n=>n.id==='result'),d=editNode('building',original,{...result,dormers:[item()]})
 const m=roofDormerModel(d,library,'result');assert.equal(m.areas.length,1);assert.equal(m.areas[0].instances[0].valid,true)
 assert.equal(d.graph.schema,17)
 const plan=previewGraph(true,d,library,'');assert.ok(plan.count>0)
 assert.deepEqual(previewGraph(true,readGraph(writeGraph('building',d),'building'),library,''),plan)
 assert.deepEqual(d.graph.nodes.find(n=>n.id==='template'),original.graph.nodes.find(n=>n.id==='template'))
 releaseRoofDormerModel(m.handle)
})
test('placement rejects ridge, uphill, boundary, missing source and overlap without generating a roof',()=>{
 const d=sample(),m=roofDormerModel(d,library,'result'),area=m.areas[0].id
 assert.equal(checkRoofDormerPlacement(m.handle,area,item()).valid,true)
 for(const candidate of [item('first',3,7),item('first',3,0,2),item('first',-1,0),{...item(),source:''}])assert.equal(checkRoofDormerPlacement(m.handle,area,candidate).valid,false)
 releaseRoofDormerModel(m.handle);assert.throws(()=>checkRoofDormerPlacement(m.handle,area,item()),/veraltet/)
})
test('source wires keep their instance ids and disconnect without removing placement',()=>{
 let d=sample(),result=d.graph.nodes.find(n=>n.id==='result');d=editNode('building',d,{...result,dormers:[item('a'),item('b',9)]})
 let rows=inspect('building',d),ports=rows.find(r=>r.node.id==='result').ports
 assert.ok(ports.some(p=>p.id==='semantic:dormer:a:source'&&p.source==='dormer'))
 d=applyWires('building',d,rows,connections(rows).filter(w=>w.port!=='semantic:dormer:a:source'))
 assert.equal(d.graph.nodes.find(n=>n.id==='result').dormers[0].source,'')
 assert.equal(d.graph.nodes.find(n=>n.id==='result').dormers[1].id,'b')
 result=d.graph.nodes.find(n=>n.id==='result');d=editNode('building',d,{...result,dormers:result.dormers.slice(1)})
 assert.ok(inspect('building',d).find(r=>r.node.id==='result').ports.some(p=>p.id==='semantic:dormer:b:source'))
})
test('all direction choices have distinct icons and inspector patches preserve other sections',()=>{
 const icons=['auto',0,1,2,3].map(q=>choiceIcon('dormerDirection',q)?.kind)
 assert.equal(new Set(icons).size,5);for(const icon of icons)assert.ok(iconPaths[icon])
 const node={id:'roof',kind:'ROOF',roofSections:[{id:'a',dormers:[]},{id:'b',dormers:[item()]}]}
 assert.deepEqual(replaceDormer(node,'roof:a',item()).roofSections[1],node.roofSections[1])
 assert.equal(dormerPatch({kind:'ROOF',roofInputMode:'TEMPLATE'},'',[]).dormers.length,0)
 assert.ok(dormerHost(sample().graph.nodes.find(n=>n.id==='result')))
})

test('frozen roof references retain consumer dormers across a template version change',()=>{
 let definition=sample({template:true});definition=editNode('building',definition,{...definition.graph.nodes.find(n=>n.id==='result'),resultType:'ROOF_TEMPLATE',producerKind:'ROOF_TEMPLATE',geometry:'',roofTemplate:null,roofInputMode:null,roofSettings:{form:'GABLE',axis:1,slope:{p:1,q:1},overhang16:0,knee16:0},inputs:Array(13).fill('copy'),dormers:null})
 const entry={id:'roof-v1',documentId:'dormer_roof',version:1,name:'Dach',mode:'building',collection:'graphs',document:definition,library}
 let r=insertSavedReference({mode:'building',document:sample(),library,materials:{},entry})
 let d=editNode('building',r.document,{...r.document.graph.nodes.find(n=>n.id==='result'),roofInputMode:'TEMPLATE',roofTemplate:r.nodeId,dormers:[item()]})
 const frozen=structuredClone(d.graph.graphDefinitions['dormer_roof@1'])
 r=insertSavedReference({mode:'building',document:d,library:r.library,materials:{},entry:{...entry,id:'roof-v2',version:2,document:{...definition,name:'Dach v2'}},targetId:r.nodeId})
 assert.deepEqual(r.document.graph.nodes.find(n=>n.id==='result').dormers,[item()]);assert.deepEqual(r.document.graph.graphDefinitions['dormer_roof@1'],frozen)
 const m=roofDormerModel(r.document,r.library,'result');assert.equal(m.areas[0].instances[0].valid,true)
})
