import test from 'node:test'
import assert from 'node:assert/strict'
import { connect, duplicateSelection, emptyGraph, extractGroup, installer, newProject, removeNodes, validateProject } from '../src/project.js'
import { saveWorkspace, readWorkspace } from '../src/workspace.js'

test('project import preserves unknown fields and rejects future formats, duplicate IDs and dangling edges',()=>{
  const p=newProject();p.futureMetadata={keep:true}
  assert.deepEqual(validateProject(p),p)
  assert.equal(validateProject({...p,name:''}).name,'') // An unfinished rename must remain a reloadable draft.
  assert.throws(()=>validateProject({...p,schema:2}),/Projektformat/)
  const duplicate=structuredClone(p);duplicate.main.nodes.push(duplicate.main.nodes[0]);assert.throws(()=>validateProject(duplicate),/Knoten/)
  const dangling=structuredClone(p);dangling.main.nodes.pop();assert.throws(()=>validateProject(dangling),/Verbindung/)
})
test('duplication remaps internal edges; deletion removes all dependent wires',()=>{
  const p=newProject(),ids=p.main.nodes.map(n=>n.id),copy=duplicateSelection(p.main,ids)
  assert.equal(copy.nodes.length,p.main.nodes.length*2)
  assert.equal(new Set(copy.nodes.map(n=>n.id)).size,copy.nodes.length)
  assert.equal(copy.dataConnections.length,2)
  assert.deepEqual(removeNodes(copy,copy.nodes.map(n=>n.id)),emptyGraph())
})
test('connections enforce channel/type distinctions and replace a single input atomically',()=>{
  const g=newProject().main,[start,clear,text,print]=g.nodes
  const defs=new Map([[start.id,{pins:[{id:'next',kind:'CONTROL',direction:'OUTPUT'}]}],[text.id,{pins:[{id:'value',kind:'DATA',direction:'OUTPUT',dataType:'STRING'}]}],[print.id,{pins:[{id:'in',kind:'CONTROL',direction:'INPUT'},{id:'value',kind:'DATA',direction:'INPUT',dataType:'ANY'}]}]])
  assert.throws(()=>connect(g,{source:text.id,sourceHandle:'value',target:print.id,targetHandle:'in'},defs),/getrennt/)
  const changed=connect(g,{source:start.id,sourceHandle:'next',target:print.id,targetHandle:'in'},defs)
  assert.equal(changed.execConnections.length,1)
  assert.equal(changed.execConnections[0].to.nodeId,print.id)
})
test('group extraction preserves external data and creates stable boundary sockets',()=>{
  const p=newProject(),print=p.main.nodes.at(-1),text=p.main.nodes[2]
  const defs=new Map([[print.id,{pins:[{id:'in',kind:'CONTROL'},{id:'value',kind:'DATA',dataType:'ANY'}]}],[text.id,{pins:[{id:'value',kind:'DATA',dataType:'STRING'}]}]])
  const next=extractGroup(p,'main',[print.id],defs,'Ausgabe')
  const group=next.groups[0],call=next.main.nodes.find(n=>n.type===`function.card.${group.id}`)
  assert.equal(group.parameters.length,1)
  assert.equal(next.main.dataConnections[0].to.nodeId,call.id)
  assert.equal(group.graph.dataConnections[0].from.pinId,group.parameters[0].id)
  assert.deepEqual(validateProject(next),next)
  assert.throws(()=>extractGroup(p,'main',[p.main.nodes[0].id],defs),/Kartengrenzen/)
  const raw=structuredClone(p);raw.main.nodes.at(-1).type='raw.lua';raw.main.nodes.at(-1).params={code:'print(capturedVariable)'}
  assert.throws(()=>extractGroup(raw,'main',[print.id],defs),/impliziten Variablen/)
})
test('workspace revisions reject stale tabs and storage errors preserve the draft',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)}
  const first=readWorkspace(storage),saved=saveWorkspace(first,0,storage)
  assert.equal(saved.revision,1)
  assert.throws(()=>saveWorkspace(first,0,storage),/anderer Tab/)
  const draft=structuredClone(saved);draft.projects[0].name='Entwurf'
  assert.throws(()=>saveWorkspace(draft,1,{...storage,setItem:()=>{throw new Error('quota')}}),/quota/)
  assert.equal(draft.projects[0].name,'Entwurf')
  assert.notEqual(readWorkspace(storage).projects[0].name,'Entwurf')
})
test('installer quotes arbitrary Lua long brackets and never overwrites a target',()=>{
  const source='print([=[closing ]], ]=] ]==])'
  const output=installer(source)
  assert.ok(output.includes(source))
  assert.ok(output.includes('assert(not fs.exists(target)'))
  assert.ok(output.includes('file.close()'))
})
