import { Handle, Position } from '@xyflow/react'
import { names, portName } from './Inspector.jsx'
import { portStyle } from './port-styles.js'
import {operatorFamily,operatorLabel} from './operator-families.js'
import { cardTypeLabel } from './card-types.js'

function Socket({preview,...props}) {
  return preview
    ? <span aria-hidden="true" className={`preview-socket preview-socket-${props.type}`} style={props.style} />
    : <Handle {...props} />
}

// Canvas and picker share the same node rendering; picker sockets are static.
export function NodeAppearance({data:{node,ports=[],groupName,outputType,hasOutput,diagnostic,reference,dynamicAxes=[],outputs=[],mode='building',onOperation},selected=false,preview=false}) {
  const family=operatorFamily(mode,node.kind)
  const source = hasOutput ?? !['BUILDING', 'OUTPUT'].includes(node.kind)
  return <div className={`diagram-node ${selected ? 'selected' : ''} ${diagnostic ? 'invalid' : ''} ${source ? '' : 'result-node'} ${preview ? 'node-preview' : ''}`}>
    <div className="node-heading">
      <span className="node-symbol">{source ? portStyle(outputType).symbol : '◆'}</span>
      <div><strong>{node.resultType ? "Ergebnis" : node.name || family?.label || names[node.kind]}</strong><small>{node.resultType ? cardTypeLabel(node.resultType) : family ? operatorLabel(mode,node.kind) : node.name ? names[node.kind] : node.id}{groupName ? ` · ${groupName}` : ''}</small></div>
      {source && outputs.length<2 && <Socket preview={preview} type="source" position={Position.Right} id={outputs[0]?.id || "out"} style={{background:portStyle(outputType).color}} aria-label={`Ausgang · ${outputType}`} title={`Ausgang · ${outputType}`} />}
    </div>
    {family && <div className="node-operation nodrag nopan" onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}><select aria-label={`${family.label} · Operation`} value={node.kind} disabled={!onOperation} onChange={event=>onOperation(event.target.value)}>{family.operations.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select></div>}
    {outputs.length>1 && <div className="ports-output">{outputs.map(output=><div className="port" key={output.id}><span>{output.name}</span><Socket preview={preview} type="source" position={Position.Right} id={output.id} style={{background:portStyle(output.type).color}} title={`${output.name} · ${output.type}`} aria-label={`Ausgang ${output.name} · ${output.type}`}/></div>)}</div>}
    {dynamicAxes.length>0 && <div className="node-reference">Dynamisch · {dynamicAxes.join(" / ")}</div>}
    {reference && <div className="node-reference" title={`${reference.documentId}@${reference.version}`}>↗ {reference.name} · v{reference.version}</div>}
    {diagnostic && <p className="node-diagnostic" role="alert" title={diagnostic}>⚠ {diagnostic}</p>}
    {ports.length > 0 && <div className="ports">{ports.map(port => <div className="port" key={port.id}>
      <Socket preview={preview} type="target" position={Position.Left} id={port.id} style={{background:portStyle(port.types?.[0]).color}} title={`${portName(port, node)} · ${(port.types || []).join(" / ")}`} />
      <span>{port.name || portName(port, node)}</span>
      <span className={`port-status ${port.source ? 'connected' : ''}`}>{port.source ? '●' : '○'}</span>
    </div>)}</div>}
  </div>
}
