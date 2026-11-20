import {describeNode,newNode} from './generated/engine.mjs'
import {editNode,inspect,model} from './model.js'

const operations=[['UNION','∪ Vereinigung'],['INTERSECTION','∩ Schnitt'],['DIFFERENCE','− Differenz'],['SYMMETRIC_DIFFERENCE','△ Symmetrische Differenz'],['ROTATE','Rotieren'],['MIRROR','Spiegeln'],['POSITION','Positionieren'],['TRANSFORM','Transformieren']]
export function operatorFamilies(mode) {
  const available=new Set(mode==='building'?model.building:model.form.map(n=>n.kind))
  const copycat=operations.map(([op,label])=>[mode==='building'?`COPYCAT_${op}`:({POSITION:'TRANSLATE',TRANSFORM:'COPYCAT_TRANSFORM'}[op] || op),label]).filter(([kind])=>available.has(kind))
  const segment=operations.map(([op,label])=>[`SEGMENT_${op}`,label]).filter(([kind])=>available.has(kind))
  return [{id:'copycat',label:'Copycat-Operator',operations:copycat},...(mode==='building'?[{id:'segments',label:'Segment-Operator',operations:segment}]:[])]
}
export const operatorFamily=(mode,kind)=>operatorFamilies(mode).find(family=>family.operations.some(([candidate])=>candidate===kind))
export const operatorLabel=(mode,kind)=>operatorFamily(mode,kind)?.operations.find(([candidate])=>candidate===kind)?.[1]

// The family UI uses the native operation kinds, retaining existing graph files.
// Match sockets by type and keep each operand once when the operation changes.
export function switchOperator(mode,document,id,kind) {
  const entries=inspect(mode,document),before=entries.find(entry=>entry.node.id===id)
  const family=operatorFamily(mode,before?.node.kind)
  if(!family || !family.operations.some(([candidate])=>candidate===kind)) throw new Error('Unpassende Operatorfamilie.')
  if(before.node.kind===kind) return document
  const building=mode==='building',old=document.graph.nodes.find(node=>node.id===id)
  let next=newNode(building,kind,id,old.x,old.y,true)
  for(const key of ['name','materialMode','materialGroup','previewGroup','role','preview','rotationAxis','quarterTurns','rotationPivot','copycatTransforms']) if(key in old) next[key]=structuredClone(old[key])
  if(kind.endsWith('MIRROR') || kind==='MIRROR') next.mirror=old.mirror
  if(kind.endsWith('POSITION') || kind==='TRANSLATE') next.translation=old.translation
  const limits=building?model.buildingInputs[kind]:model.form.find(n=>n.kind===kind)
  const geometryPorts=before.ports.filter(port=>port.types.some(type=>['shape','COPYCAT','WALL'].includes(type)))
  if(limits && limits.min!==limits.max) next.inputs=Array.from({length:Math.max(limits.min,Math.min(limits.max,geometryPorts.length))},()=> '')
  const preview=describeNode(building,{...document,graph:{...document.graph,nodes:document.graph.nodes.map(n=>n.id===id?next:n)}},id)
  const remaining=[...before.ports],mapping=new Map(),matches=[]
  for(const port of preview.ports) {
    const sameType=oldPort=>port.types.some(type=>oldPort.types.includes(type))
    const match=remaining.find(oldPort=>sameType(oldPort) && oldPort.source) || remaining.find(sameType)
    if(!match) continue
    remaining.splice(remaining.indexOf(match),1);mapping.set(match.id,port.id);matches.push([match,port])
    if(building && !port.id.startsWith('in:')) next[port.id]=match.source || null
    else next.inputs[Number(port.id.replace('in:',''))]=match.source
  }
  if(!building) next.inputGroups=next.inputs.map((_,i)=>old.inputGroups?.[Number(matches.find(([,port])=>Number(port.id)===i)?.[0].id)] || '')
  if(building && model.directAreas && /^SEGMENT_(UNION|INTERSECTION|DIFFERENCE|SYMMETRIC_DIFFERENCE)$/.test(kind)) {
    const values=old.operandOffsets ?? (old.kind==='SEGMENT_UNION'?old.offsets:[]) ?? []
    next.operandOffsets=next.inputs.map((_,i)=>values[Number(matches.find(([,port])=>port.id===`in:${i}`)?.[0].id.replace('in:',''))] ?? {x:0,y:0,z:0})
    next.offsets=[]
  }
  if(building && next.operandOffsets==null) for(const key of ['offsets']) if(old[key]?.length) next[key]=next.inputs.map((_,i)=>old[key][Number(matches.find(([,port])=>port.id===`in:${i}`)?.[0].id.replace('in:',''))] ?? {x:0,y:0,z:0})
  // Named group inputs keep their socket identities as well. Removed sockets
  // disappear from the interface; unrelated targets and outputs stay in place.
  const owner=document.graph.nodeGroups?.find(group=>group.nodes.includes(id))
  const member=owner?.nodes.indexOf(id)
  const nodeGroups=document.graph.nodeGroups?.map(group=>{
    if(!group.graphInterface || !owner || (group.definitionId || group.id)!==(owner.definitionId || owner.id)) return group
    const face=group.graphInterface
    const inputs=face.inputs.map(input=>({...input,targets:input.targets.flatMap(target=>target.member!==member?[target]:mapping.has(target.port)?[{...target,port:mapping.get(target.port)}]:[])})).filter(input=>input.targets.length)
    return {...group,graphInterface:{...face,inputs},inputConnections:Object.fromEntries(Object.entries(group.inputConnections || {}).filter(([key])=>inputs.some(input=>input.id===key)))}
  })
  return editNode(mode,nodeGroups?{...document,graph:{...document.graph,nodeGroups}}:document,next)
}
