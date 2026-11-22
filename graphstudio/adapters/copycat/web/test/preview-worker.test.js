import test from 'node:test'
import assert from 'node:assert/strict'
import {newCard} from '../src/cards.js'
import {newNode,transformDiagnostics} from '../src/generated/engine.mjs'
import {replaceNodes,editNode} from '../src/model.js'
const messages=[]
globalThis.self={postMessage:message=>messages.push(message)}
await import('../src/preview.worker.js')
const run=document=>{self.onmessage({data:{id:7,mode:'building',document,library:{forms:{},modules:{}},selected:'',materials:{},viewKey:'roof'}});return messages.at(-1)}
test('worker announces readiness and returns a usable graph preview',()=>{
 assert.deepEqual(messages[0],{ready:true})
 const result=run(newCard());assert.equal(result.id,7);assert.equal(result.viewKey,'roof');assert.ok(result.plan.count>0);assert.equal(result.error,undefined)
})
test('failed result previews still mark the result node after skipping the duplicate evaluation',()=>{
 let document=newCard(),result=document.graph.nodes.find(n=>n.resultType)
 document=editNode('building',document,{...result,resultType:'ROOF',producerKind:'ROOF',roofInputMode:'TEMPLATE',inlinePart:null,geometry:'',roofTemplate:null})
 assert.equal(transformDiagnostics(true,document,{forms:{},modules:{}},false).length,0)
 assert.ok(transformDiagnostics(true,document,{forms:{},modules:{}}).some(d=>d.nodeId===result.id))
 const actual=run(document);assert.ok(actual.error);assert.ok(actual.diagnostics.some(d=>d.nodeId===result.id&&d.message===actual.error))
})
test('diagnostics for invalid non-result values remain available',()=>{
 let document=newCard()
 const n=(kind,id,extra={})=>({...newNode(true,kind,id,0,0,true),...extra})
 document=replaceNodes(document,[...document.graph.nodes,n('INT','one',{countValue:1}),n('INT','zero',{countValue:0}),n('INT_DIVIDE','bad',{inputs:['one','zero']})])
 const actual=run(document);assert.ok(actual.plan.count>0);assert.ok(actual.diagnostics.some(d=>d.nodeId==='bad'))
})
