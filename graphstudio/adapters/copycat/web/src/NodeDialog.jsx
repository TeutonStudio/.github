import { model } from './model.js'
import { cardTypeLabel } from './card-types.js'
import { useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { names } from './Inspector.jsx'
import { NodeAppearance } from './DiagramNode.jsx'
import { OperatorFields } from './OperatorChoice.jsx'
import { catalogKinds,draftNode,operatorIdentity,families,signature,switchDraft,filterCatalog } from './operators.js'
import { describeNode } from './generated/engine.mjs'
import { portStyle,portStyles,semanticType } from './port-styles.js'
import { describeCatalogNode,categoryOfNode,nodeCategories } from './node-catalog.js'
const label=node=>families[operatorIdentity(node)?.family]?.label || names[node.kind] || node.kind
const leaf=()=>({direction:'input',type:'shape'})
function Rule({rule,onChange,onRemove,level=0}) {
 if(rule.children)return <fieldset className="filter-group"><legend>Filtergruppe</legend><div className="button-row"><select aria-label="Filterverknüpfung" value={rule.op} onChange={e=>onChange({...rule,op:e.target.value})}><option value="AND">UND · alle Bedingungen</option><option value="OR">ODER · mindestens eine</option></select><button type="button" onClick={()=>onChange({...rule,children:[...rule.children,leaf()]})}>+ Bedingung</button>{level<4 && <button type="button" onClick={()=>onChange({...rule,children:[...rule.children,{op:'OR',children:[leaf()]}]})}>+ Gruppe</button>}{onRemove && <button type="button" aria-label="Filtergruppe entfernen" onClick={onRemove}>×</button>}</div>{rule.children.map((r,i)=><Rule key={i} rule={r} level={level+1} onChange={next=>onChange({...rule,children:rule.children.map((v,j)=>i===j?next:v)})} onRemove={()=>onChange({...rule,children:rule.children.filter((_,j)=>i!==j)})}/>)}</fieldset>
 return <div className="filter-condition"><select aria-label="Anschlussrichtung" value={rule.direction} onChange={e=>onChange({...rule,direction:e.target.value})}><option value="input">Eingang enthält</option><option value="output">Ausgang ist</option></select><select aria-label="Anschlusstyp" value={rule.type} onChange={e=>onChange({...rule,type:e.target.value})}>{Object.entries(portStyles).map(([type,style])=><option key={type} value={type}>Typgruppe · {style.symbol} {style.name}</option>)}{model.cardTypes.map(type=><option key={type} value={`type:${type}`}>Exakter Typ · {cardTypeLabel(type)}</option>)}</select><button type="button" aria-label="Filterbedingung entfernen" onClick={onRemove}>×</button></div>
}
export function NodeDialog({mode,document,kinds,count,maxNodes,onAdd,onClose,onGrab,state,setState}) {
 const {query='',sort='name',descending=false,group='none',rule=null,drafts={},selected=null}=state
 const patch=next=>setState(previous=>({...previous,...next}))
 const choices=useMemo(()=>catalogKinds(kinds).map(kind=>{
   const node=drafts[kind] || draftNode(mode,kind)
   const candidate={...document,graph:{...document.graph,nodes:[...document.graph.nodes.filter(n=>n.id!=='preview'),node]}}
   return {description:describeCatalogNode(kind),...describeNode(mode==='building',candidate,node.id),node,...(kind==='POSITION_X'?{outputs:['X','Y','Z'].map(id=>({id,name:id,type:'INT'}))}:{})}
 }),[mode,kinds.join('|'),document,drafts])
 const visible=filterCatalog(choices,{query,rule,sort,descending},label)
 const groups=new Map()
 for(const entry of visible) {
  const key=group==='output'?portStyle(entry.outputType).name:group==='inputs'?`${entry.ports.length} Eingänge`:group==='family'?label(entry.node):group==='category'?(nodeCategories.find(([id])=>id===categoryOfNode(entry.node.kind))?.[1] || 'Operatoren'):'Alle Knoten'
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry)
 }
 const update=(kind,node)=>patch({drafts:{...drafts,[kind]:node},selected:kind})
 const current=visible.find(e=>e.node.kind===selected)
 return <Modal title="Knoten hinzufügen" className="node-dialog" onClose={onClose}>
 <p className="hint">Operator wählen, Anschlüsse und Erklärung prüfen. Ein Klick wählt nur die Vorschau. Ziehe den Knoten an die gewünschte Stelle auf der Karte.</p>
 <div className="catalog-tools"><label>Suchen<input data-autofocus type="search" value={query} placeholder="Name, Operator oder Aufgabe …" onChange={e=>patch({query:e.target.value})}/></label><label>Sortieren nach<select value={sort} onChange={e=>patch({sort:e.target.value})}><option value="name">Name</option><option value="output">Ausgangstyp</option><option value="inputs">Anzahl Eingänge</option><option value="family">Knotenfamilie</option></select></label><label>Reihenfolge<select value={String(descending)} onChange={e=>patch({descending:e.target.value==='true'})}><option value="false">Aufsteigend</option><option value="true">Absteigend</option></select></label><label>Gruppieren nach<select value={group} onChange={e=>patch({group:e.target.value})}><option value="none">Keine Gruppierung</option><option value="output">Ausgangstyp</option><option value="inputs">Anzahl Eingänge</option><option value="family">Knotenfamilie</option><option value="category">Aufgabe</option></select></label></div>
 <details className="catalog-filters"><summary>Filtern {rule?'· aktiv':''}</summary>{rule?<><Rule rule={rule} onChange={rule=>patch({rule})}/><button type="button" onClick={()=>patch({rule:null})}>Filter zurücksetzen</button></>:<button type="button" onClick={()=>patch({rule:{op:'AND',children:[leaf()]}})}>+ Anschlussfilter</button>}</details>
 <p className="hint" role="status">{visible.length} passende Knoten · {count} / {maxNodes} auf der Karte</p>
 <div className="catalog-groups">{[...groups].map(([name,items])=><details className="catalog-group" open key={`${group}:${name}`}><summary>{name} · {items.length}</summary><div className="node-catalog">{items.map(entry=>{
  const {node}=entry,kind=node.kind,op=operatorIdentity(node)
  return <article className={`catalog-card ${selected===kind?'chosen':''}`} key={kind} tabIndex="0" aria-label={`Vorschau · ${label(node)}`} onClick={()=>patch({selected:kind})} onKeyDown={e=>{if(e.target===e.currentTarget && ['Enter',' '].includes(e.key)){e.preventDefault();patch({selected:kind})}}}>
   <div className="catalog-node"><NodeAppearance preview selected={selected===kind} data={{...entry,hasOutput:true,onOperation:operation=>update(kind,switchDraft(mode,node,operation).node)}} onGrab={e=>{patch({selected:kind});onGrab(e,node,entry)}}/></div>
   <p>{op?signature(node).description:describeCatalogNode(kind)}</p><small>{portStyle(entry.outputType).symbol} Ausgang: {portStyle(entry.outputType).name} · {entry.ports.length} Eingänge</small>
   {op && selected===kind && <OperatorFields roles={Object.keys(document.palette || {})} showDescription={false} node={node} edit={change=>update(kind,{...node,...change})}/>}
  </article>
 })}</div></details>)}</div>
 {!visible.length && <p>Keine passenden Knoten. Ändere die Suche oder die Anschlussfilter.</p>}
 <footer><button type="button" onClick={onClose}>Schließen</button><button type="button" disabled={!current || count>=maxNodes} onClick={()=>onAdd(current.node)}>Ausgewählten Knoten in Kartenmitte einfügen</button></footer>
 </Modal>
}
