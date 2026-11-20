import {describeNode,newNode,authoringBuildingNode} from './generated/engine.mjs'
import {categoryOfNode,describeCatalogNode,nodeCategories} from './node-catalog.js'
import {semanticType,portStyle} from './port-styles.js'
import {operatorFamily} from './operator-families.js'
import {inputListEnabled} from './input-list.js'

export function nodePreview(mode,kind) {
  const building=mode==='building'
  const draft=newNode(building,kind,'preview',0,0,true)
  const node=building?authoringBuildingNode(draft):draft
  const terminals=building
    ? [newNode(true,'SEGMENT','empty_wall',0,0,true),newNode(true,'BUILDING','result',0,0,true)]
    : [newNode(false,'OUTPUT','result',0,0)]
  return {mode,...describeNode(building,{schema:building?2:3,palette:{wall:'minecraft:stone'},graph:{schema:building?8:5,nodes:[...terminals,node]}},node.id)}
}

export function pickerEntries(kinds,mode,labels,properties,operations={}) {
  const seen=new Set()
  return kinds.flatMap(candidate=>{
    const family=operatorFamily(mode,candidate)
    if(family && seen.has(family.id)) return []
    if(family) seen.add(family.id)
    const kind=family ? operations[family.id] || family.operations[0][0] : candidate
    const preview=nodePreview(mode,kind)
    return [{kind,family:family?.id,search:family?.operations.map(([kind,label])=>`${kind} ${label}`).join(" "),label:family?.label || labels[kind] || kind,category:categoryOfNode(kind),description:describeCatalogNode(kind),preview,
      output:semanticType(preview.outputType),inputs:preview.ports.length,variable:inputListEnabled(properties[kind]),available:properties[kind]?.available!==false}]
  })
}

export function selectPickerEntries(entries,{query='',category='all',output='all',capability='all',sort='name',direction='asc'}={}) {
  const needle=query.trim().toLocaleLowerCase('de')
  const key=entry=>({name:entry.label,category:nodeCategories.find(([id])=>id===entry.category)?.[1] || entry.category,output:portStyle(entry.output).name,inputs:entry.inputs}[sort] ?? entry.label)
  return entries.filter(entry=>(category==='all' || entry.category===category) && (output==='all' || entry.output===output)
    && (capability==='all' || entry.available && entry.variable===(capability==='yes'))
    && `${entry.label} ${entry.kind} ${entry.description} ${entry.search || ""}`.toLocaleLowerCase('de').includes(needle))
    .sort((a,b)=>{
      const left=key(a),right=key(b)
      const order=typeof left==='number' ? left-right : String(left).localeCompare(String(right),'de',{numeric:true})
      return (order || a.label.localeCompare(b.label,'de'))*(direction==='desc'?-1:1)
    })
}

export function groupPickerEntries(entries,group='none') {
  if(group==='none') return [['all',entries]]
  const groups=new Map()
  for(const entry of entries) {
    const key=group==='property' ? entry.available ? entry.variable ? 'yes':'no' : 'unknown' : entry[group]
    if(!groups.has(key)) groups.set(key,[])
    groups.get(key).push(entry)
  }
  return [...groups]
}
