export function roofEdgeSettings(node,model,id,patch) {
  const stored=new Map((node.roofEdges||[]).map(edge=>[edge.id,edge]))
  return {roofEdges:model.edges.map(edge=>({id:edge.id,mode:edge.mode,source:model.defaultSource||'',...stored.get(edge.id),...(edge.id===id?patch:{})}))}
}
export const roofEdgeModeChoices=[['ROOF','Dach'],['FACADE','Fassade']]
export const roofEdgeDirections=['Nord','Ost','Süd','West']
// A hidden socket can still retain its source for a later mode/outline switch.
export function retainsRoofEdgeSource(document,wire) {
  const prefix='semantic:roofEdge:'
  if(!wire.port.startsWith(prefix))return false
  const id=wire.port.slice(prefix.length).replace(/:source$/,'')
  return !!document.graph.nodes.find(node=>node.id===wire.target)?.roofEdges?.some(edge=>edge.id===id&&edge.source===wire.source)
}
