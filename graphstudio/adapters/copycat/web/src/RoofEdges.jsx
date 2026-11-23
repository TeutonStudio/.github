import {useEffect,useRef,useState} from 'react'
import {IconSelect} from './IconSelect.jsx'
import {roofEdgeSettings,roofEdgeModeChoices,roofEdgeDirections} from './roof-edge-settings.js'
export function RoofEdgeFields({node,document,library,edit}) {
  const active=node.kind==='ROOF'&&node.roofInputMode
  const [model,setModel]=useState(null),[error,setError]=useState(''),[selected,setSelected]=useState(''),[retry,setRetry]=useState(0)
  const revision=useRef(0)
  useEffect(()=>{
    setModel(null);setError('')
    if(!active)return
    const request=++revision.current,worker=new Worker(new URL('./roof-edges.worker.js',import.meta.url),{type:'module'})
    const timer=setTimeout(()=>setError('Kantenprüfung konnte nicht geladen werden.'),10000)
    worker.onmessage=({data})=>{
      if(request!==revision.current)return
      if(data.action==='ready'){clearTimeout(timer);worker.postMessage({request,id:node.id,document,library});return}
      if(data.request!==request)return
      if(data.error){setError(data.error);return}
      setModel(data.model);setSelected(old=>data.model.edges.some(e=>e.id===old)?old:data.model.edges[0]?.id||'')
    }
    worker.onerror=e=>{clearTimeout(timer);if(request===revision.current)setError(e.message||'Kantenprüfung fehlgeschlagen')}
    return()=>{clearTimeout(timer);revision.current++;worker.terminate()}
  },[active,node.id,document,library,retry])
  if(!active)return null
  const change=(id,patch)=>edit(roofEdgeSettings(node,model,id,patch))
  const points=model?.points||[],minX=points.length?Math.min(...points.map(p=>p.x)):0,minZ=points.length?Math.min(...points.map(p=>p.z)):0
  const width=points.length?Math.max(...points.map(p=>p.x))+1-minX:1,depth=points.length?Math.max(...points.map(p=>p.z))+1-minZ:1
  const font=Math.max(width,depth)/22
  return <details open className="native-fields roof-edge-fields"><summary>Flächenkanten · Dach / Fassade</summary>
    <p className="hint">Jede gerade Randstrecke besitzt eine eigene Wahl. Die Segmenthöhe begrenzt die Fassade; oberhalb schließt eine Dachschräge an. Dachkanten verwenden die angeschlossene Dachvorlage.</p>
    {node.roofEdges!=null?<button type="button" onClick={()=>edit({roofEdges:null})}>Bisherige Dachform wiederherstellen</button>:<p className="hint">Ausgangsbelegung aus der bisherigen Dachform. Die erste Änderung aktiviert individuelle Kanten.</p>}
    {error?<><p role="alert" className="error">{error}</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Erneut prüfen</button></>:!model?<p role="status">Flächenkanten werden ermittelt …</p>:!points.length?<p className="hint">Eine Fläche anschließen, um ihre Kanten zu bearbeiten.</p>:<>
      <svg className="roof-edge-map" viewBox={`${minX-font*2} ${minZ-font*2} ${width+font*4} ${depth+font*4}`} role="group" aria-label="Dachgrundriss mit nummerierten Kanten">
        {points.map(p=><rect key={`${p.x}:${p.z}`} x={p.x} y={p.z} width="1" height="1" className="roof-edge-cell"/>)}
        {model.edges.map((edge,index)=>{
          const dx=edge.end.x-edge.start.x,dz=edge.end.z-edge.start.z,len=Math.hypot(dx,dz)
          const x=(edge.start.x+edge.end.x)/2+dz/len*font*.8,z=(edge.start.z+edge.end.z)/2-dx/len*font*.8
          return <g key={edge.id} className={`roof-edge-line ${edge.mode.toLowerCase()} ${selected===edge.id?'selected':''}`} role="button" aria-label={`Kante ${index+1} auswählen`} tabIndex="0" onClick={()=>setSelected(edge.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(edge.id)}}}>
            <title>{`Kante ${index+1} · ${roofEdgeDirections[edge.direction]} · ${edge.mode==='FACADE'?'Fassade':'Dach'}`}</title>
            <line x1={edge.start.x} y1={edge.start.z} x2={edge.end.x} y2={edge.end.z} strokeWidth={font*.16}/>
            <circle cx={x} cy={z} r={font*.5}/><text x={x} y={z} fontSize={font*.6} textAnchor="middle" dominantBaseline="central">{index+1}</text>
          </g>
        })}
      </svg>
      <div className="roof-edge-list">{model.edges.map((edge,index)=>{
        const entry=node.roofEdges?.find(e=>e.id===edge.id),source=entry?.source??model.defaultSource??''
        return <fieldset key={edge.id} className={selected===edge.id?'selected':''} onFocus={()=>setSelected(edge.id)}>
          <legend>Kante {index+1} · {roofEdgeDirections[edge.direction]} · {edge.length} B</legend>
          <label>Aufbau<IconSelect domain="RoofEdgeMode" aria-label={`Kante ${index+1} Aufbau`} value={edge.mode} onChange={e=>change(edge.id,{mode:e.target.value})}>
            {roofEdgeModeChoices.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </IconSelect></label>
          {edge.mode==='FACADE'&&<>
            <label>Fassadensegment<IconSelect domain="node" aria-label={`Kante ${index+1} Fassadensegment`} value={source} onChange={e=>change(edge.id,{source:e.target.value})}>
              <option value="" iconMeta={{type:'SEGMENT'}}>Segment anschließen</option>
              {source&&!model.definitions.some(d=>d.id===source)&&<option value={source} iconMeta={{type:'SEGMENT'}}>{source}</option>}
              {model.definitions.map(d=><option key={d.id} value={d.id} iconMeta={{type:'SEGMENT'}}>{d.name}</option>)}
            </IconSelect></label>
            {edge.height!=null&&<p>Maximale Fassadenhöhe: <output>{edge.height} B</output></p>}
            {edge.message&&<p role="alert" className="error">{edge.message}</p>}
            {node.roofEdges==null&&<p className="hint">Noch ohne individuelle Höhenbegrenzung.</p>}
          </>}
        </fieldset>
      })}</div>
    </>}
  </details>
}
