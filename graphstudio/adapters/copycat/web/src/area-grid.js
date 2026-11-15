export const areaModes = [['SQUARE', 'Quadrat'], ['RECTANGLE', 'Rechteck'], ['DRAW', 'Anklicken']]
export const areaKey = (x,z) => `${x},${z}`
export function areaModePatch(node, mode, points) {
  if (!areaModes.some(([value])=>value===mode)) throw new Error('Unbekannter Flächenmodus')
  return { areaMode:mode, dimensions: mode==='DRAW' ? null : Object.fromEntries(Object.entries(node.dimensions || {}).filter(([key])=>key==='length' || mode==='RECTANGLE' && key==='height')),
    ...(mode==='DRAW' && node.areaMode!=='DRAW' ? {coordinates:points} : {}) }
}
export function paintArea(points, cells, selected) {
  const occupied=new Map(points.map(p=>[areaKey(p.x,p.z),{x:p.x,y:0,z:p.z}]))
  for(const {x,z} of cells) {
    if(!Number.isInteger(x) || !Number.isInteger(z) || x < -128 || x > 127 || z < -128 || z > 127) continue
    if(selected) occupied.set(areaKey(x,z),{x,y:0,z});else occupied.delete(areaKey(x,z))
  }
  if(occupied.size>16384) throw new Error('Eine Fläche darf höchstens 16384 Zellen enthalten.')
  return [...occupied.values()].sort((a,b)=>a.z-b.z || a.x-b.x)
}
export function fitArea(points) {
  if(!points.length) return [-3,-3,12,12]
  const minX=Math.min(...points.map(p=>p.x)),minZ=Math.min(...points.map(p=>p.z))
  const width=Math.max(...points.map(p=>p.x))-minX+1,depth=Math.max(...points.map(p=>p.z))-minZ+1
  const size=Math.max(8,width+4,depth+4)
  return [minX-(size-width)/2,minZ-(size-depth)/2,size,size]
}
export function rasterLine(from,to) {
  const steps=Math.max(Math.abs(to.x-from.x),Math.abs(to.z-from.z))
  return Array.from({length:steps+1},(_,i)=>({x:Math.round(from.x+(to.x-from.x)*i/(steps || 1)),z:Math.round(from.z+(to.z-from.z)*i/(steps || 1))}))
}
