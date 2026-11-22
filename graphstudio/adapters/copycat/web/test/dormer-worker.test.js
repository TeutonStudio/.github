import test from 'node:test'
import assert from 'node:assert/strict'
import {sample} from './fixtures/dormer-fixture.js'
const messages=[]
globalThis.self={postMessage:message=>messages.push(message)}
await import('../src/dormer.worker.js')
const run=data=>{self.onmessage({data});return messages.at(-1)}
const instance={id:'draft',source:'dormer',position:{x:3,y:0,z:0},direction:2,openCeiling:false}
test('dormer worker loads an exact map and proposes a downhill orientation',()=>{
 assert.deepEqual(messages[0],{action:'ready'})
 const model=run({action:'model',revision:1,nodeId:'result',document:sample(),library:{forms:{},modules:{}}})
 assert.ok(model.model.areas[0].surfaces.length>0)
 const reply=run({action:'check',revision:1,request:4,area:model.model.areas[0].id,instance,automatic:true})
 assert.equal(reply.request,4);assert.equal(reply.check.valid,true);assert.equal(reply.check.instance.direction,0)
})
test('manual orientation and ridge crossings return explicit placement errors',()=>{
 const area=messages.find(m=>m.model)?.model.areas[0].id
 assert.equal(run({action:'check',revision:1,request:5,area,instance,automatic:false}).check.valid,false)
 const result=run({action:'check',revision:1,request:6,area,instance:{...instance,position:{x:3,y:0,z:7}},automatic:true})
 assert.equal(result.check.valid,false);assert.match(result.check.message,/First|Kehle/)
})
test('obsolete pointer queries are discarded after a new document revision',()=>{
 run({action:'model',revision:2,nodeId:'result',document:sample(),library:{forms:{},modules:{}}})
 const before=messages.length;run({action:'check',revision:1,request:7,area:'result:section_1',instance,automatic:true});assert.equal(messages.length,before)
})
