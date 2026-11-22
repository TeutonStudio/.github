import {newNode} from '../../src/generated/engine.mjs'
import {newCard} from '../../src/cards.js'
import {replaceNodes} from '../../src/model.js'
export function sample({form='GABLE',contour='BOUNDS',points=null,template=false}={}) {
 let d=newCard();const n=(kind,id,extra={})=>({...newNode(true,kind,id,0,0,true),...extra})
 const area=n('AREA','area',{areaMode:points?'DRAW':'RECTANGLE',length:14,height:18,coordinates:points||[]})
 const copy=n('COPYCAT','copy',{inlinePart:{source:'copycats:copycat_block'}}),wallArea=n('AREA','wall_area',{areaMode:'SQUARE',length:1,height:1}),wall=n('SEGMENT','wall',{module:'',length:1,height:1,depth:1,inputs:['copy'],assembly:true,layout:'wall_area'})
 const dormer=n('DORMER','dormer',{name:'Sattelgaube',dormer:{width:3,depth:3,wallHeight:2,slope:{p:1,q:1},wall:'wall',front:'wall',roof:'copy'}})
 const settings={form,axis:1,slope:{p:1,q:1},overhang16:0,knee16:0,contourMode:contour}
 const definition=n('ROOF_TEMPLATE','template',{inputs:Array(13).fill('copy'),roofSettings:settings})
 const result={...d.graph.nodes.find(n=>n.id==='result'),name:'Dach mit Gauben',inlinePart:null,resultType:'ROOF',resultMode:'CONSTRUCT',producerKind:'ROOF',geometry:'area',roofInputMode:template?'TEMPLATE':'SEGMENTS',roofTemplate:template?'template':null,inputs:Array(13).fill('copy'),roofSettings:template?null:settings,dormers:[]}
 return replaceNodes(d,d.graph.nodes.filter(n=>n.id!=='result').concat(area,copy,wallArea,wall,dormer,definition,result))
}
