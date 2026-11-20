// This is a capability of the operation, never a user override of its mathematics.
export function inputListEnabled(properties) {
  return properties?.commutativeAssociative === true
}
export function inputOrder(count, action, index, delta) {
  const order=Array.from({length:count},(_,i)=>i)
  if(action==='add') return [...order,-1]
  if(!Number.isInteger(index) || index<0 || index>=count) throw new Error('Ungültiger Eingang.')
  if(action==='remove') return order.filter(i=>i!==index)
  const target=index+delta
  if(action!=='move' || ![-1,1].includes(delta) || target<0 || target>=count) throw new Error('Ungültige Eingangsreihenfolge.')
  ;[order[index],order[target]]=[order[target],order[index]]
  return order
}
