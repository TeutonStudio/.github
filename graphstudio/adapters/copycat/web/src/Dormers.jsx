import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'
import {IconSelect} from './IconSelect.jsx'
import {IntegerField} from './IntegerField.jsx'
import {fitArea} from './area-grid.js'
import {dormerDirections,dormerList,dormerPatch,replaceDormer} from './dormer-placement.js'
const Context=createContext(null)
export const useDormers=()=>useContext(Context)
export function DormerProvider({node,document,library,edit,readOnly,children}) {
  const [model,setModel]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[areaId,setArea]=useState(''),[draft,setDraft]=useState(null),[automatic,setAutomatic]=useState(false),[validation,setValidation]=useState(null),[source,setSource]=useState('')
  const worker=useRef(null),revision=useRef(0),pending=useRef(new Map()),serial=useRef(0),change=useRef(edit)
  change.current=edit
  const id=node?.id
  useEffect(()=>{
    if(!id){setModel(null);return}
    const rev=++revision.current
    setModel(null);setError('');setValidation(null)
    const w=new Worker(new URL('./dormer.worker.js',import.meta.url),{type:'module'});worker.current=w
    const fail=message=>{setError(message);for(const p of pending.current.values())p.reject(Error(message));pending.current.clear()}
    const timer=setTimeout(()=>fail('Gaubenprüfung konnte nicht geladen werden. Lokalen Server prüfen und erneut laden.'),10000)
    w.onmessage=({data})=>{
      if(rev!==revision.current)return
      if(data.action==='ready'){clearTimeout(timer);w.postMessage({action:'model',revision:rev,nodeId:id,document,library});return}
      if(data.revision!==rev)return
      if(data.action==='model'){
        if(data.error){fail(data.error);return}
        setModel(data.model);setArea(old=>data.model.areas.some(a=>a.id===old)?old:data.model.areas[0]?.id||'')
        setSource(old=>data.model.definitions.some(d=>d.id===old)?old:data.model.definitions[0]?.id||'')
      }else{const callback=pending.current.get(data.request);pending.current.delete(data.request);if(callback)data.error?callback.reject(Error(data.error)):callback.resolve(data.check)}
    }
    w.onerror=e=>{clearTimeout(timer);fail(e.message||'Gaubenprüfung fehlgeschlagen')}
    return()=>{clearTimeout(timer);revision.current++;w.terminate();worker.current=null;for(const p of pending.current.values())p.reject(Error('Dachprüfung erneuert'));pending.current.clear()}
  },[id,document,library,retry])
  useEffect(()=>{setDraft(null);setValidation(null)},[id,areaId,document])
  const check=useCallback((instance,auto=false)=>new Promise((resolve,reject)=>{
    if(!worker.current||!model){reject(Error('Dachprüfung wird geladen'));return}
    const request=++serial.current;pending.current.set(request,{resolve,reject});worker.current.postMessage({action:'check',revision:revision.current,request,area:areaId,instance,automatic:auto})
  }),[model,areaId])
  useEffect(()=>{
    setValidation(null)
    if(!draft||!model)return
    let cancelled=false
    const frame=requestAnimationFrame(()=>check(draft.instance,automatic).then(result=>{if(!cancelled)setValidation(result)},e=>{if(!cancelled)setValidation({valid:false,message:e.message,points:[]})}))
    return()=>{cancelled=true;cancelAnimationFrame(frame)}
  },[draft,model,automatic,check])
  const area=model?.areas.find(a=>a.id===areaId)
  const cancel=()=>{setDraft(null);setValidation(null)}
  const select=item=>{setAutomatic(false);setDraft({isNew:false,instance:structuredClone(item)})}
  const begin=()=>{if(readOnly||!source||!area||area.instances.length>=16)return;setAutomatic(true);setDraft({isNew:true,instance:{id:crypto.randomUUID(),source,position:{x:0,y:0,z:0},direction:0,openCeiling:false}})}
  const apply=async(instance=draft?.instance)=>{
    if(readOnly||!draft||!instance)return false
    const rev=revision.current
    try{const result=await check(instance,automatic);if(rev!==revision.current)return false;setValidation(result);if(!result.valid)return false;change.current(replaceDormer(node,areaId,result.instance));cancel();return true}
    catch(e){if(rev===revision.current)setValidation({valid:false,message:e.message,points:[]});return false}
  }
  const remove=()=>{if(readOnly||!draft)return;change.current(dormerPatch(node,areaId,dormerList(node,areaId).filter(i=>i.id!==draft.instance.id)));cancel()}
  const value=node?{node,readOnly,model,error,loading:!model&&!error,reload:()=>setRetry(n=>n+1),area,areaId,setArea,draft,setDraft,automatic,setAutomatic,validation,source,setSource,select,begin,apply,cancel,remove,check}:null
  return <Context.Provider value={value}>{children}</Context.Provider>
}
function SourceSelect({value,onChange,disabled,definitions}) {
  return <label>Gaubenquelle<IconSelect domain="node" aria-label="Gaubenquelle" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>
    {!definitions.some(d=>d.id===value)&&<option value={value} iconMeta={{type:'DORMER'}}>{value||'Gauben-Knoten wählen'}</option>}
    {definitions.map(d=><option key={d.id} value={d.id} iconMeta={{type:'DORMER'}}>{d.name}</option>)}
  </IconSelect></label>
}
export function DormerInstanceFields() {
  const ctx=useDormers()
  if(!ctx)return null
  const {draft,setDraft,model,area,readOnly,validation}=ctx
  const patch=next=>setDraft({...draft,instance:{...draft.instance,...next}})
  return <details open className="native-fields dormer-inspector"><summary>Gauben am Dach</summary>
    {ctx.loading&&<p role="status">Dachflächen werden geprüft …</p>}
    {ctx.error&&<p role="alert">{ctx.error} <button onClick={ctx.reload}>Erneut laden</button></p>}
    {model&&<>
      {model.areas.length>1&&<label>Dachfläche<IconSelect domain="node" value={ctx.areaId} onChange={e=>ctx.setArea(e.target.value)}>{model.areas.map(a=><option key={a.id} value={a.id} iconMeta={{type:'ROOF_LEVEL'}}>{a.name}</option>)}</IconSelect></label>}
      <label>Gaubeninstanz<IconSelect domain="node" aria-label="Gaubeninstanz" value={draft?.isNew?'_new':draft?.instance.id||''} onChange={e=>{const item=area.instances.find(i=>i.instance.id===e.target.value);if(item)ctx.select(item.instance);else ctx.cancel()}}>
        <option value="" iconMeta={{placeholder:true}}>Instanz wählen …</option>{draft?.isNew&&<option value="_new" iconMeta={{type:'DORMER'}}>Neue Gaube</option>}
        {area?.instances.map((item,i)=><option key={item.instance.id} value={item.instance.id} iconMeta={{type:'DORMER'}}>Gaube {i+1}{item.valid?'':' · Position prüfen'}</option>)}
      </IconSelect></label>
      {!draft&&<><SourceSelect value={ctx.source} definitions={model.definitions} disabled={readOnly} onChange={ctx.setSource}/><button disabled={readOnly||!ctx.source||area?.instances.length>=16} onClick={ctx.begin}>Neue Gaube platzieren</button><p className="hint">Gauben-Knoten über + Knoten anlegen. Im Grundriss klicken oder die Position hier eingeben. Höchstens 16 Gauben je Dachfläche.</p></>}
      {draft&&<fieldset disabled={readOnly} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();ctx.cancel()}}}>
        <legend>{draft.isNew?'Neue Gaube':'Gaube bearbeiten'}</legend>
        <SourceSelect value={draft.instance.source} definitions={model.definitions} onChange={source=>patch({source})}/>
        <div className="coordinate-grid" style={{'--coordinate-count':2}}>{['x','z'].map(axis=><IntegerField key={axis} label={`${axis.toUpperCase()} · Blöcke`} value={draft.instance.position[axis]} min={-128} max={128} onChange={value=>patch({position:{...draft.instance.position,[axis]:value}})}/>)}</div>
        <label>Vorderseite<IconSelect domain="dormerDirection" aria-label="Gaubenrichtung" value={ctx.automatic?'auto':draft.instance.direction} onChange={e=>{ctx.setAutomatic(e.target.value==='auto');if(e.target.value!=='auto')patch({direction:Number(e.target.value)})}}>
          <option value="auto">Automatisch hangabwärts</option>{dormerDirections.map(([q,name])=><option key={q} value={q}>{name}</option>)}
        </IconSelect></label>
        <label className="check"><input type="checkbox" checked={draft.instance.openCeiling} onChange={e=>patch({openCeiling:e.target.checked})}/>Geschossdecke öffnen</label>
        <p className="hint">Breite, Tiefe, Wandhöhe und Dachneigung am Gauben-Knoten einstellen.</p>
        {!validation&&<p role="status">Position wird geprüft …</p>}{validation&&!validation.valid&&<p role="alert">{validation.message}</p>}
        <div className="button-row"><button className="primary" disabled={!validation?.valid} onClick={()=>ctx.apply()}>Gaube übernehmen</button><button onClick={ctx.cancel}>Abbrechen</button>{!draft.isNew&&<button onClick={ctx.remove}>Gaube entfernen</button>}</div>
      </fieldset>}
    </>}
  </details>
}
export function DormerPlacementPanel({collapsed,onToggle}) {
  const ctx=useDormers(),svg=useRef(null),drag=useRef(null)
  const [viewport,setViewport]=useState(null)
  useEffect(()=>{setViewport(null);drag.current=null},[ctx?.node.id,ctx?.areaId])
  if(!ctx)return null
  const {area,draft,validation,readOnly}=ctx,points=area?.points||[],bounds=viewport||fitArea(points)
  const point=e=>{const p=svg.current.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const v=p.matrixTransform(svg.current.getScreenCTM().inverse());return {x:Math.floor(v.x),y:0,z:Math.floor(v.y)}}
  const move=e=>{
    const state=drag.current
    if(state?.pan){const rect=svg.current.getBoundingClientRect(),scale=state.bounds[2]/Math.min(rect.width,rect.height);setViewport([state.bounds[0]-(e.clientX-state.x)*scale,state.bounds[1]-(e.clientY-state.z)*scale,...state.bounds.slice(2)]);return}
    if(!draft||readOnly)return
    const p=point(e)
    const position=state?.start?{x:state.origin.x+p.x-state.start.x,y:0,z:state.origin.z+p.z-state.start.z}:p
    ctx.setDraft({...draft,instance:{...draft.instance,position}})
  }
  const key=e=>{if(e.ctrlKey||e.metaKey)return;if(e.key==='Escape'){e.stopPropagation();ctx.cancel();drag.current=null}if(e.key==='Enter'&&draft){e.preventDefault();e.stopPropagation();ctx.apply()}
    const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key]
    if(delta&&draft&&!readOnly){e.preventDefault();e.stopPropagation();const p=draft.instance.position;ctx.setDraft({...draft,instance:{...draft.instance,position:{x:p.x+delta[0],y:0,z:p.z+delta[1]}}})}}
  const path=values=>values.map(p=>`M${p.x},${p.z}h1v1h-1Z`).join('')
  const shown=validation?.instance||draft?.instance
  return <section className="preview-panel dormer-panel" aria-label="2D-Gaubenplatzierung"><div className="panel-heading"><span>Gauben · X/Z</span><button aria-expanded={!collapsed} aria-label={collapsed?'Gaubenbereich ausklappen':'Gaubenbereich einklappen'} onClick={onToggle}>{collapsed?'▸':'▾'}</button></div>
    {!collapsed&&<div className="area-preview-body">
      <p className="hint">{draft?.isNew?'Im Grundriss bewegen und klicken, um die Gaube zu setzen.':draft?'Gaube ziehen oder Pfeiltasten nutzen. Enter übernimmt; Escape verwirft.':'Gaube im Grundriss auswählen. Neue Gauben im Inspektor platzieren.'}</p>
      {ctx.error&&<p role="alert">{ctx.error}</p>}{ctx.loading&&<p role="status">Dachflächen werden geladen …</p>}
      <svg ref={svg} className="area-grid dormer-grid" role="application" aria-label="Gaubenraster" tabIndex={0} viewBox={bounds.join(' ')} onKeyDown={key} onContextMenu={e=>e.preventDefault()}
        onPointerDown={e=>{if(e.button===1){e.preventDefault();drag.current={pan:true,x:e.clientX,z:e.clientY,bounds};svg.current.setPointerCapture(e.pointerId);return}if(readOnly||e.button!==0)return;e.preventDefault();svg.current.focus();if(draft?.isNew){const position=point(e);ctx.setDraft({...draft,instance:{...draft.instance,position}});ctx.apply({...draft.instance,position});return}
          const p=point(e),hit=area?.instances.find(i=>i.points.some(c=>c.x===p.x&&c.z===p.z));if(hit){ctx.select(hit.instance);drag.current={start:p,origin:hit.instance.position,instance:hit.instance};svg.current.setPointerCapture(e.pointerId)}}}
        onPointerMove={e=>{if(draft?.isNew||drag.current)move(e)}} onPointerUp={e=>{const state=drag.current;if(state){drag.current=null;if(!state.pan){const p=point(e);ctx.apply({...state.instance,position:{x:state.origin.x+p.x-state.start.x,y:0,z:state.origin.z+p.z-state.start.z}})}if(svg.current.hasPointerCapture(e.pointerId))svg.current.releasePointerCapture(e.pointerId)}}}
        onPointerCancel={()=>{drag.current=null;ctx.cancel()}} onLostPointerCapture={()=>{drag.current=null}}>
        <rect x={bounds[0]} y={bounds[1]} width={bounds[2]} height={bounds[3]} fill="#14232d"/>
        <path d={path(points)} fill="#385563"/>
        {area?.surfaces.map((face,i)=><polygon key={i} points={face.points.map(p=>`${p.x},${p.z}`).join(' ')} fill={['#416875','#52777d','#3c5d6a','#4b6b72'][face.direction]} stroke="#91b5bb" strokeWidth=".02"/>)}
        {area?.instances.filter(i=>i.instance.id!==draft?.instance.id).map((item,i)=><g key={item.instance.id}><path d={path(item.points)} fill={item.valid?'#c4aa64':'#bf6262'} fillOpacity=".8" stroke="#ffe4a3" strokeWidth=".04"/><DirectionArrow instance={item.instance} points={item.points}/><text x={item.instance.position.x+.5} y={item.instance.position.z+.75} fontSize=".65" fill="#fff">{i+1}</text></g>)}
        {draft&&<g><path d={path(validation?.points||[])} fill={validation?.valid?'#d6b75b':'#db5959'} fillOpacity=".8" stroke="#fff0c5" strokeWidth=".06"/>{shown&&<DirectionArrow instance={shown} points={validation?.points||[]}/>}</g>}
      </svg>
      <div className="area-toolbar"><button onClick={()=>setViewport(([x,z,w,h]=bounds)=>[x-w*.1,z-h*.1,w*1.2,h*1.2])}>−</button><button onClick={()=>setViewport(([x,z,w,h]=bounds)=>[x+w*.1,z+h*.1,Math.max(4,w*.8),Math.max(4,h*.8)])}>＋</button><button onClick={()=>setViewport(null)}>Einpassen</button>{draft&&<button disabled={readOnly||!validation?.valid} onClick={()=>ctx.apply()}>Übernehmen</button>}</div>
      {validation&&!validation.valid&&<p role="alert">{validation.message}</p>}
    </div>}
  </section>
}

function DirectionArrow({instance,points}) {
  if(!points.length)return null
  const x=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x))+1)/2,z=(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z))+1)/2
  const dx=[0,1,0,-1][instance.direction],dz=[-1,0,1,0][instance.direction],ex=x+dx*.8,ez=z+dz*.8
  return <path d={`M${x-dx*.6},${z-dz*.6}L${ex},${ez}M${ex-dx*.5-dz*.35},${ez-dz*.5+dx*.35}L${ex},${ez}L${ex-dx*.5+dz*.35},${ez-dz*.5-dx*.35}`} fill="none" stroke="white" strokeWidth=".13" strokeLinecap="round"/>
}
