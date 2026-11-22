export const dormerDirections=[[0,'Nord'],[1,'Ost'],[2,'Süd'],[3,'West']]
export function dormerHost(node) {
  if(!node)return null
  const kind=node.kind==='RESULT'&&node.resultMode!=='VALUE'?node.producerKind:node.kind
  return kind==='ROOF_LEVEL'||kind==='ROOF'&&(node.roofInputMode||node.roofSections||node.assembly&&node.layout)?{...node,kind}:null
}
export function dormerList(node,area) {
  return node.kind==='ROOF'&&!node.roofInputMode&&node.roofSections?node.roofSections.find(s=>`${node.id}:${s.id}`===area)?.dormers||[]:node.dormers||[]
}
export function dormerPatch(node,area,instances) {
  if(node.kind==='ROOF'&&!node.roofInputMode&&node.roofSections)return {roofSections:node.roofSections.map(section=>`${node.id}:${section.id}`===area?{...section,dormers:instances}:section)}
  return {dormers:instances}
}
export function replaceDormer(node,area,instance) {
  const list=dormerList(node,area)
  return dormerPatch(node,area,list.some(i=>i.id===instance.id)?list.map(i=>i.id===instance.id?instance:i):[...list,instance])
}
export function pointInPolygon(point,polygon) {
  let inside=false
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j]
    if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)inside=!inside
  }
  return inside
}
