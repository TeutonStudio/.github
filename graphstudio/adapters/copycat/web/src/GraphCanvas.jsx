import { useCallback, useLayoutEffect, useState } from 'react'
import { applyNodeChanges, ReactFlow } from '@xyflow/react'
import { reconcileCanvasNodes } from './canvas-nodes.js'

// Pointer positions and DOM measurements stay on the canvas. They do not change
// the document, inspector, library or preview until a complete drag is committed.
export function GraphCanvas({ nodes: projected, onNodesChange: onSelectionChange, onNodeDragStop, ...props }) {
  const [nodes, setNodes] = useState(projected)
  useLayoutEffect(() => {
    setNodes(current => reconcileCanvasNodes(current, projected))
  }, [projected])
  const onNodesChange = useCallback(changes => {
    setNodes(current => applyNodeChanges(changes, current))
    if (changes.some(change => change.type === 'select')) onSelectionChange(changes)
  }, [onSelectionChange])
  const stopDrag = (...args) => {
    // Accept the committed, rounded/clamped coordinates on the next projection.
    setNodes(current => reconcileCanvasNodes(current.map(node => node.dragging ? { ...node, dragging: false } : node), projected))
    onNodeDragStop(...args)
  }
  return <ReactFlow {...props} nodes={nodes} onNodesChange={onNodesChange} onNodeDragStop={stopDrag} />
}
