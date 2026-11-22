import { previewGraph, transformDiagnostics } from './generated/engine.mjs'
self.onmessage = ({ data: { id, mode, document, library, selected, materials,viewKey } }) => {
  let diagnostics=[]
  // previewGraph validates and evaluates the result itself. Compiling the entire
  // roof again for its diagnostic doubles the first preview's work.
  try {diagnostics=transformDiagnostics(mode === 'building',document,library,false)} catch {}
  try {self.postMessage({id,diagnostics,viewKey,plan:previewGraph(mode === 'building',document,library,selected,materials)})}
  catch(error) {
    const message=error.message || String(error)
    const result=document.graph.nodes.find(node=>node.kind==='RESULT' || node.resultType)
    if(mode==='building' && result && (!selected || selected===result.id)) diagnostics=[...diagnostics,{nodeId:result.id,message}]
    self.postMessage({id,diagnostics,viewKey,error:message})
  }
}
self.postMessage({ready:true})
