import {model,editNode,editInputs,promoteNumbers} from './model.js'
import {reorderDraft} from './input-list.js'
import {axisLabel} from './axis-labels.js'
export const orders=['SRP','SPR','RSP','RPS','PRS','PSR']
const orderNames={S:'Spiegeln',R:'Rotieren',P:'Positionieren'}
export const get=(n,path)=>path.split('.').reduce((v,key)=>v?.[key],n)
const set=(n,path,value)=>{const [key,...rest]=path.split('.');return {...n,[key]:rest.length?set(n[key]||{},rest.join('.'),value):value}}
export function nodeControls(mode,node) {
 const result=[],pick=(path,label,value,choices)=>result.push({path,label,value,choices}),number=(path,label,value,min,max)=>result.push({path,label,value,min,max})
 if(['INT','COUNT'].includes(node.kind)) {pick('$numberType','Zahlentyp',node.kind,[['COUNT','Anzahl'],['INT','Ganzzahl']]);number('countValue','Wert',node.countValue??(node.kind==='INT'&&mode==='building'?4:0),node.kind==='COUNT'?0:-2147483648,2147483647)}
 if(node.kind==='TRANSFORMATION')pick('transformationOrder','Reihenfolge',node.transformationOrder||'SRP',orders.map(v=>[v,`${v} · ${[...v].map(l=>orderNames[l]).join(' → ')}`]))
 if(node.resultType)pick('resultType','Ausgabetyp',node.resultType,model.cardTypes.filter(t=>t!=='VALUE'))
 if(node.kind==='AREA') {
  pick('areaMode','Flächenmodus',node.areaMode||'DRAW',[['SQUARE','Quadrat'],['RECTANGLE','Rechteck'],['DRAW','Zeichnen']])
  if(node.areaMode==='SQUARE'||node.areaMode==='RECTANGLE')number('length',node.areaMode==='SQUARE'?'Seitenlänge':axisLabel('X'),node.length,1,128)
  if(node.areaMode==='RECTANGLE')number('height',axisLabel('Z'),node.height,1,128)
 }
 if(node.kind==='ROOF' && model.cardTypes.includes('ROOF_TEMPLATE'))pick('roofInputMode','Dachaufbau',node.roofInputMode||'LEGACY',[...(node.roofInputMode?[]:[['LEGACY','Bisheriger Dachaufbau']]),['TEMPLATE','Fläche, Dachvorlage'],['SEGMENTS','Fläche, Segmente …']])
 if(node.kind==='SEGMENT' && node.id!=='empty_wall') {
  const axes=(node.dynamicAxes||[]).join('')
  pick('dynamicAxes','Dynamische Achsen',axes,[['','Feste Maße'],...['X','Y','Z','XY','XZ','YZ','XYZ'].map(v=>[v,[...v].join(' / ')])])
 }
 if(node.kind==='ROOM')pick('roomConfig.mode','Raumaufbau',node.roomConfig?.mode||'FOOTPRINT',[['FOOTPRINT','Fläche und Wände'],['SEGMENTS','Segmente']])
 if(node.kind==='STOREY')pick('storeyMode','Geschossaufbau',node.storeyMode||'rooms',[['rooms','Räume'],['walls','Wände']])
 if(node.kind==='BOOLEAN')pick('booleanValue','Booleanwert',node.booleanValue===true?'true':'false',[['false','Falsch'],['true','Wahr']])
 if(node.kind==='BOOLEAN_LOGIC')pick('operation','Operation',node.operation||'AND',[['AND','UND'],['OR','ODER'],['XOR','XOR'],['NOT','NICHT']])
 if(node.kind==='INT_COMPARE')pick('operation','Vergleich',node.operation||'EQUAL',[['EQUAL','='],['NOT_EQUAL','≠'],['LESS','<'],['LESS_EQUAL','≤'],['GREATER','>'],['GREATER_EQUAL','≥'],['DIVISIBLE','Teilbar · A ÷ B ∈ ℤ']])
 const operation=model.operators?.[node.kind]?.operations[node.operation || model.operators[node.kind].default]
 const limits=operation || (mode==='building'?model.buildingInputs[node.kind]:model.form.find(n=>n.kind===node.kind))
 if(limits&&limits.max>limits.min && !node.resultType && !['SEGMENT','ROOF','BOOLEAN_LOGIC','POSITION'].includes(node.kind))number('$inputCount','Eingänge',node.inputs.length,limits.min,limits.max)
 return result
}
export function configureNode(node,path,value) {
 if(path==='$inputOrder')return reorderDraft(node,value)
 if(path==='$numberType')return {...node,kind:value,countValue:node.countValue??0}
 if(path==='$inputCount')return {...node,inputs:Array.from({length:Number(value)},(_,i)=>node.inputs[i]||'')}
 if(path==='roofInputMode'&&value==='LEGACY')value=null
 if(path==='dynamicAxes')value=[...value]
 if(path==='booleanValue')value=value==='true'
 let next=set(node,path,value)
 if(path==='operation'&&node.kind==='BOOLEAN_LOGIC')next.inputs=Array.from({length:value==='NOT'?1:2},(_,i)=>node.inputs[i]||'')
 return next
}
export function configureDocument(mode,document,id,path,value) {
 if(path==='$numberType')document=promoteNumbers(mode,document)
 const node=document.graph.nodes.find(n=>n.id===id)
 if(path==='$inputOrder')return editInputs(mode,document,id,value)
 if(path==='$inputCount') {let next=document;while(next.graph.nodes.find(n=>n.id===id).inputs.length!==Number(value)) {const count=next.graph.nodes.find(n=>n.id===id).inputs.length;next=editInputs(mode,next,id,Array.from({length:count+(count<Number(value)?1:-1)},(_,i)=>i<count?i:-1))};return next}
 return editNode(mode,document,configureNode(node,path,value))
}
