import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {previewGraph,newNode,wireModels} from '../src/generated/engine.mjs'
import {editNode,replaceNodes,writeGraph,readGraph} from '../src/model.js'
import {choiceIcon,iconPaths} from '../src/choice-icons.js'
const original=JSON.parse(readFileSync(new URL('./fixtures/testdach-building.json',import.meta.url)))
const library={forms:{},modules:{}}
for(const definition of Object.values(original.graph.graphDefinitions)){Object.assign(library.forms,definition.forms);Object.assign(library.modules,definition.modules)}
function cross() {
 const area={...newNode(true,'AREA','area',0,0,true),areaMode:'DRAW',coordinates:Array.from({length:7},(_,z)=>Array.from({length:z>=2&&z<=4?5:3},(_,i)=>({x:i-(z>=2&&z<=4?1:0),y:0,z}))).flat()}
 const result={...original.graph.nodes.find(n=>n.id==='result'),geometry:'area'}
 return replaceNodes(original,original.graph.nodes.filter(n=>n.id!=='result').concat(area,result))
}
test('every contour dropdown entry has a distinct registered icon and a native enum value',()=>{
 assert.deepEqual(wireModels().enums.RoofContourMode,['BOUNDS','CONTOUR'])
 const kinds=['','BOUNDS','CONTOUR'].map(value=>choiceIcon('RoofContourMode',value)?.kind)
 assert.equal(new Set(kinds).size,3)
 for(const kind of kinds)assert.ok(iconPaths[kind])
})
test('the original Boolean Testdach changes contour mode and survives export and import',()=>{
 const d=cross(),result=d.graph.nodes.find(n=>n.id==='result'),legacy=previewGraph(true,d,library,'')
 const next=editNode('building',d,{...result,roofSettings:{...result.roofSettings,contourMode:'CONTOUR'}})
 const plan=previewGraph(true,next,library,'');assert.ok(plan.count>0);assert.notDeepEqual(plan.meshes,legacy.meshes)
 assert.equal(next.graph.schema,16)
 assert.deepEqual(previewGraph(true,readGraph(writeGraph('building',next),'building'),library,''),plan)
 assert.equal(d.graph.nodes.find(n=>n.id==='result').roofSettings.contourMode??'BOUNDS','BOUNDS')
})
test('a consumer can override contour mode without altering its referenced template',()=>{
 const d=cross(),template={...d.graph.nodes.find(n=>n.id==='result'),id:'template',kind:'ROOF_TEMPLATE',resultType:null,resultMode:null,producerKind:null}
 const result={...newNode(true,'RESULT','result',0,0,true),resultType:'ROOF',resultMode:'CONSTRUCT',producerKind:'ROOF',inlinePart:null,geometry:'area',roofTemplate:'template',roofInputMode:'TEMPLATE',roofContourMode:'CONTOUR'}
 const consumed=replaceNodes(d,d.graph.nodes.filter(n=>n.id!=='result').concat(template,result))
 const expected=editNode('building',d,{...d.graph.nodes.find(n=>n.id==='result'),roofSettings:{...template.roofSettings,contourMode:'CONTOUR'}})
 assert.deepEqual(previewGraph(true,consumed,library,'').meshes,previewGraph(true,expected,library,'').meshes)
 assert.equal(consumed.graph.nodes.find(n=>n.id==='template').roofSettings.contourMode??'BOUNDS','BOUNDS')
})
