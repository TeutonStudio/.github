import {roofDormerModel,checkRoofDormerPlacement,releaseRoofDormerModel} from './generated/engine.mjs'
import {pointInPolygon} from './dormer-placement.js'
let model=null,modelRevision=null
self.onmessage=({data})=>{
  const {action,revision,request}=data
  try {
    if(action==='model') {
      if(model)releaseRoofDormerModel(model.handle)
      model=null;modelRevision=revision
      model=roofDormerModel(data.document,data.library,data.nodeId)
      self.postMessage({action,revision,model})
    } else if(action==='check') {
      if(revision!==modelRevision)return
      let instance=data.instance
      if(data.automatic) {
        const area=model.areas.find(a=>a.id===data.area),point={x:instance.position.x+.5,z:instance.position.z+.5}
        const direction=area?.surfaces.find(s=>pointInPolygon(point,s.points))?.direction??instance.direction
        instance={...instance,direction}
        for(const q of [direction,...[0,1,2,3].filter(q=>q!==direction)]) {
          const candidate={...instance,direction:q},check=checkRoofDormerPlacement(model.handle,data.area,candidate)
          if(check.valid){instance=candidate;break}
        }
      }
      const check=checkRoofDormerPlacement(model.handle,data.area,instance)
      self.postMessage({action,revision,request,check:{...check,instance}})
    }
  }catch(error){self.postMessage({action,revision,request,error:error.message||String(error)})}
}
self.postMessage({action:'ready'})
