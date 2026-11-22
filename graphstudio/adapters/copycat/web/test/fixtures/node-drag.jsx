import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Background, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GraphCanvas } from '../../src/GraphCanvas.jsx'
import { selectNodes } from '../../src/selection.js'

window.dragTest = { renders:0, commits:0, cards:0 }
function Card({data}) {
  window.dragTest.cards++
  return <div style={{padding:20,background:'#213c4b',color:'white',width:140}}><Handle type="target" position={Position.Left}/>{data.title}<Handle type="source" position={Position.Right}/></div>
}
const types = { card: Card }
function Harness() {
  window.dragTest.renders++
  const [nodes,setNodes] = useState(() => Array.from({length:48},(_,i)=>({id:`node_${i}`,type:'card',position:{x:i%8*210,y:Math.floor(i/8)*100},data:{title:`Knoten ${i}`},selected:false})))
  const onNodesChange = useCallback(changes => setNodes(current => {
    const previous=current.filter(n=>n.selected).map(n=>n.id),selected=selectNodes(previous,changes)
    return selected===previous || selected.length===previous.length && selected.every(id=>previous.includes(id)) ? current : current.map(n=>({...n,selected:selected.includes(n.id)}))
  }),[])
  const stop = (_,node,moved) => {
    if (window.dragTest.reject) return
    window.dragTest.commits++
    const positions=new Map((moved?.length?moved:[node]).map(n=>[n.id,{x:Math.round(n.position.x),y:Math.round(n.position.y)}]))
    setNodes(current=>current.map(n=>positions.has(n.id)?{...n,position:positions.get(n.id)}:n))
  }
  window.dragTest.document=nodes
  return <div style={{width:'100vw',height:'95vh'}}><GraphCanvas nodes={nodes} nodeTypes={types} onNodesChange={onNodesChange} onNodeDragStop={stop} fitView><Background/></GraphCanvas></div>
}
createRoot(document.getElementById('root')).render(<Harness/>)
