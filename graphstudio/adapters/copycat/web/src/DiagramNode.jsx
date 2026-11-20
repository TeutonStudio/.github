import { useEffect } from 'react'
import { Handle,Position,useUpdateNodeInternals } from '@xyflow/react'
import { names,portName } from './Inspector.jsx'
import { cardTypeLabel } from './card-types.js'
import { portStyle } from './port-styles.js'
import { caption,families,operatorIdentity } from './operators.js'
import { OperatorChoice } from './OperatorChoice.jsx'
export function NodeAppearance({data,selected=false,preview=false,onGrab}) {
 const {node,ports=[],groupName,outputType,hasOutput,diagnostic,reference,dynamicAxes=[],outputs=[],onOperation,readOnly}=data
 const source=hasOutput ?? (!node.resultType && !['BUILDING','OUTPUT'].includes(node.kind)),identity=operatorIdentity(node)
 const socket=(type,id,raw)=>preview?<span className={`preview-socket ${type}`} style={{background:portStyle(raw).color}} title={`${type==='source'?'Ausgang':'Eingang'} · ${raw}`}/>:<Handle type={type} position={type==='source'?Position.Right:Position.Left} id={id} style={{background:portStyle(raw).color}} aria-label={`${type==='source'?'Ausgang':'Eingang'} · ${raw}`}/>
 return <div className={`diagram-node ${selected?'selected':''} ${diagnostic?'invalid':''} ${source?'':'result-node'}`} onPointerDown={onGrab}>
 <div className="node-heading"><span className="node-symbol">{source?portStyle(outputType).symbol:'◆'}</span><div><strong>{node.resultType?'Ergebnis':node.name || (identity?families[identity.family].label:names[node.kind])}</strong><small>{node.resultType?cardTypeLabel(node.resultType):identity?caption(node):node.name?names[node.kind]:node.id}{groupName?` · ${groupName}`:''}</small></div>{source && outputs.length<2 && socket('source',outputs[0]?.id || 'out',outputType)}</div>
 {identity && <OperatorChoice node={node} disabled={readOnly} onChange={onOperation}/>}
 {outputs.length>1 && <div className="ports-output">{outputs.map(o=><div className="port" key={o.id}><span>{o.name}</span>{socket('source',o.id,o.type)}</div>)}</div>}
 {dynamicAxes.length>0 && <div className="node-reference">Dynamisch · {dynamicAxes.join(' / ')}</div>}
 {reference && <div className="node-reference" title={`${reference.documentId}@${reference.version}`}>↗ {reference.name} · v{reference.version}</div>}
 {diagnostic && <p className="node-diagnostic" role="alert" title={diagnostic}>⚠ {diagnostic}</p>}
 {ports.length>0 && <div className="ports">{ports.map(p=><div className="port" key={p.id}>{socket('target',p.id,p.types?.[0])}<span>{p.name || portName(p,node)}</span><span className={`port-status ${p.source?'connected':''}`}>{p.source?'●':'○'}</span></div>)}</div>}
 </div>
}
export function DiagramNode({id,data,selected}) {
 const update=useUpdateNodeInternals(),signature=JSON.stringify([data.ports,data.outputs,data.node.operation])
 useEffect(()=>update(id),[id,signature,update])
 return <NodeAppearance {...{data,selected}}/>
}
