import { model } from './model.js'
import { families,operatorIdentity,symbols,signature } from './operators.js'
export function OperatorChoice({node,onChange,disabled=false}) {
 const identity=operatorIdentity(node)
 if(!identity)return null
 return <select className="operator-choice nodrag nopan nowheel" aria-label={`Operator · ${node.name || families[identity.family].label}`} value={identity.operation} disabled={disabled} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onChange={e=>onChange(e.target.value)}>{Object.entries(families[identity.family].operations).map(([value,op])=><option key={value} value={value}>{symbols[value]} {op.label}</option>)}</select>
}
export function OperatorFields({node,edit,showDescription=true,roles=[]}) {
 const identity=operatorIdentity(node);if(!identity)return null
 const {operation:op,family}=identity
 const number=(label,key,value)=> <label>{label}<input type="number" min={-2147483648} max={2147483647} step="1" defaultValue={value} key={`${node.id}:${key}:${value}`} onBlur={e=>{const v=Number(e.target.value);if(e.target.value.trim() && Number.isInteger(v) && v>=-2147483648 && v<=2147483647)edit({[key]:v})}}/></label>
 return <div className="operator-fields">{showDescription && <p className="hint">{signature(node).description}</p>}
 {family==='NUMBER_OPERATOR' && op==='VALUE' && number('Anzahl','numberValue',node.numberValue ?? node.countValue ?? 0)}
 {family==='RELATION_OPERATOR' && number('Vergleichswert B (bei offenem Eingang)','comparisonValue',node.comparisonValue ?? 0)}
 {family==='STATEMENT_OPERATOR' && op==='VALUE' && <label>Aussage<select value={String(node.booleanValue ?? false)} onChange={e=>edit({booleanValue:e.target.value==='true'})}><option value="false">Falsch</option><option value="true">Wahr</option></select></label>}
 {(family==='POSITION_OPERATOR' && op==='VALUE' || op==='TRANSLATE') && <fieldset><legend>Position (hB)</legend>{['x','y','z'].map(axis=><label key={axis}>{axis.toUpperCase()}<input type="number" step="1" defaultValue={node.translation?.[axis] ?? 0} key={`${node.id}:${axis}:${node.translation?.[axis]}`} onBlur={e=>{const v=Number(e.target.value);if(Number.isInteger(v) && Math.abs(v)<=2147483647)edit({translation:{...node.translation,[axis]:v}})}}/></label>)}</fieldset>}
 {op==='ROTATE' && <><label>Achse<select value={node.rotationAxis || 'Y'} onChange={e=>edit({rotationAxis:e.target.value})}>{['X','Y','Z'].map(a=><option key={a}>{a}</option>)}</select></label><label>Drehung<select value={node.quarterTurns || 0} onChange={e=>edit({quarterTurns:Number(e.target.value)})}>{[0,1,2,3].map(a=><option value={a} key={a}>{a*90}°</option>)}</select></label></>}
 {op==='MIRROR' && <label>Spiegelebene<select value={node.mirror?.plane || 'X'} onChange={e=>edit({mirror:{plane:e.target.value}})}>{(family==='COPYCAT_OPERATOR'?model.mirrorPlanes:['X','Y','Z']).map(a=><option key={a}>{a}</option>)}</select></label>}
 {['COPYCAT_OPERATOR','SEGMENT_OPERATOR'].includes(family) && <><label>Materialzuordnung<select value={node.materialMode || 'SEPARATED'} onChange={e=>edit({materialMode:e.target.value})}><option value="SEPARATED">Materialien getrennt erhalten</option><option value="GROUPED">Gemeinsame Materialrolle</option></select></label>{(node.materialMode==='GROUPED' || op==='INVERT') && <label>Materialrolle<select value={node.role || 'wall'} onChange={e=>edit({role:e.target.value})}>{[...new Set([node.role || 'wall',...roles])].map(role=><option key={role}>{role}</option>)}</select></label>}</>}
 </div>
}
