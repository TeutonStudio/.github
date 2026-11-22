// React Flow owns measured dimensions and in-progress positions. Document edits
// own everything else, including the final position and controlled selection.
export function reconcileCanvasNodes(current, projected) {
  const previous = new Map(current.map(node => [node.id, node]))
  return projected.map(node => {
    const old = previous.get(node.id)
    if (!old) return node
    return {
      ...node,
      measured: old.measured,
      dragging: old.dragging,
      position: old.dragging ? old.position : node.position,
    }
  })
}
