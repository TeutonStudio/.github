import { previewGraph, transformDiagnostics } from './generated/engine.mjs'
self.onmessage = ({ data: { id, mode, document, library, selected, materials } }) => {
  let diagnostics=[]
  try {diagnostics=transformDiagnostics(mode === 'building',document,library)} catch {}
  try {self.postMessage({id,diagnostics,plan:previewGraph(mode === 'building',document,library,selected,materials)})}
  catch(error) {self.postMessage({id,diagnostics,error:error.message || String(error)})}
}
