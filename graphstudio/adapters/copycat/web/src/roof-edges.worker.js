import {roofEdgeModel} from './generated/engine.mjs'
self.onmessage=({data})=>{
  const {request,document,library,id}=data
  try{self.postMessage({request,model:roofEdgeModel(document,library,id)})}
  catch(error){self.postMessage({request,error:error.message||String(error)})}
}
self.postMessage({action:'ready'})
