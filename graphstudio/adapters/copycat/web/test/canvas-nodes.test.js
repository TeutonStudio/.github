import test from 'node:test'
import assert from 'node:assert/strict'
import { applyNodeChanges } from '@xyflow/react'
import { reconcileCanvasNodes } from '../src/canvas-nodes.js'

const node = (id, x = 0) => ({id,type:'architect',position:{x,y:0},data:{title:id},selected:false})

test('dragging changes only moved nodes and keeps card data stable', () => {
  const original = [node('a'),node('b',100)]
  const measured = applyNodeChanges([{type:'dimensions',id:'a',dimensions:{width:180,height:96}}],original)
  const dragged = applyNodeChanges([{type:'position',id:'a',position:{x:35.5,y:12.2},dragging:true}],measured)
  assert.equal(dragged[1],original[1])
  assert.equal(dragged[0].data,original[0].data)
  assert.deepEqual(dragged[0].measured,{width:180,height:96})
  assert.deepEqual(original[0].position,{x:0,y:0})
  const selected = reconcileCanvasNodes(dragged,original.map(n=>({...n,selected:n.id==='a'})))
  assert.deepEqual(selected[0].position,{x:35.5,y:12.2})
  assert.equal(selected[0].selected,true)
  assert.equal(selected[0].data,original[0].data)
})

test('committed positions, undo and redo retain measured dimensions without retaining transient coordinates', () => {
  const original = [node('a')]
  const measured = applyNodeChanges([{type:'dimensions',id:'a',dimensions:{width:180,height:96}}],original)
  const moved = applyNodeChanges([{type:'position',id:'a',position:{x:35.5,y:12.2},dragging:false}],measured)
  const committed = reconcileCanvasNodes(moved,[{...original[0],position:{x:36,y:12}}])
  assert.deepEqual(committed[0].position,{x:36,y:12})
  const undone = reconcileCanvasNodes(committed,original)
  assert.deepEqual(undone[0].position,original[0].position)
  const redone = reconcileCanvasNodes(undone,committed)
  assert.deepEqual(redone[0].position,committed[0].position)
  for (const state of [committed,undone,redone]) assert.deepEqual(state[0].measured,{width:180,height:96})
})

test('imports and removal discard obsolete nodes and measurements and preserve incoming order', () => {
  const current = [node('old'),{...node('kept'),measured:{width:200,height:140}}]
  const incoming = [node('new'),{...node('kept'),data:{title:'Renamed'}}]
  const next = reconcileCanvasNodes(current,incoming)
  assert.deepEqual(next.map(n=>n.id),['new','kept'])
  assert.equal(next[0],incoming[0])
  assert.equal(next[0].measured,undefined)
  assert.equal(next[1].data.title,'Renamed')
  assert.deepEqual(next[1].measured,{width:200,height:140})
})
