import baseLibrary from '../../examples/library.json'
import { JsonEditor } from './JsonEditor.jsx'
import { referenceDisabled } from './studio-actions.js'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal.jsx'
import { Viewer } from './Preview.jsx'
import { useWorkspace } from './Workspace.jsx'
import { previewGraph } from './generated/engine.mjs'
import { previewCopycatOption } from './copycat-options.js'
import { readGraph } from './model.js'
import { validateNodeGroup } from './node-groups.js'
import { appendVersion, identityOf, dependencies, deleteVersion, validateReferences } from './documents.js'
export function FileDialog({ mode, onChoose, onReference, currentIdentity, readOnly, actions, onClose }) {
  const {data,update,catalog}=useWorkspace()
  const [query,setQuery]=useState(''), [kind,setKind]=useState('all'), [selected,setSelected]=useState(null), [deleting,setDeleting]=useState(false), [error,setError]=useState(''), [editing,setEditing]=useState(false)
  const entries=useMemo(() => [...data.graphs.map(entry => ({...entry,collection:'graphs',type:entry.mode === 'form' ? 'Form / Formgraph' : 'Gebäudegraph'})),...data.nodeGroups.map(entry => ({...entry,collection:'nodeGroups',type:'Knotengruppe'}))].filter(entry => entry.mode === mode || mode === 'building' && entry.mode === 'form' && entry.collection === 'graphs'),[data,mode])
  const chosen=entries.find(entry => entry.id === selected)
  const [plan,setPlan]=useState(null)
  useEffect(() => {
    setPlan(null);setError('');setDeleting(false)
    if (chosen?.collection === 'nodeGroups') {setPlan(chosen.preview || null);return}
    if (!chosen?.document) return
    const timer=setTimeout(() => {try {setPlan(chosen.mode === 'form' ? previewCopycatOption(chosen) : previewGraph(true,chosen.document,chosen.library || {},''))} catch(e) {setError(`Vorschau: ${e.message}`)}},0)
    return () => clearTimeout(timer)
  },[chosen?.id,mode])
  const refs=chosen ? dependencies(data,chosen) : []
  const entryPayload=chosen && (chosen.collection === 'nodeGroups' ? Object.fromEntries(['name','mode','schema','nodes','wires','groups','materials','library'].filter(key=>chosen[key] !== undefined).map(key=>[key,chosen[key]])) : chosen.document)
  const saveDraft=payload => {
    const {collection,type,...entry}=chosen
    let changed=collection === 'nodeGroups' ? {...entry,...payload,preview:undefined,document:undefined} : {...entry,document:payload}
    const saved=appendVersion(data[collection],changed,identityOf(chosen)).at(-1)
    update(current=>({...current,[collection]:[...current[collection],saved]}))
    setEditing(false);setSelected(saved.id)
  }
  const disabledReference=referenceDisabled(chosen,currentIdentity,readOnly)
  const remove=()=>{
    if(!deleting) {setDeleting(true);return}
    try {update(current=>deleteVersion(current,chosen.collection,chosen.id));setSelected(null);setDeleting(false)} catch(e) {setError(e.message)}
  }
  return <Modal title="Bibliothek" className="file-dialog" onClose={onClose}>
    <div className="file-dialog-actions">{actions}</div>
    <div className="file-filters"><label>Suchen<input autoFocus data-autofocus type="search" value={query} onChange={e=>{setQuery(e.target.value);setSelected(null)}} /></label><label>Typ<select value={kind} onChange={e=>{setKind(e.target.value);setSelected(null)}}><option value="all">Alle</option><option value="graphs">Graphen / Formen</option><option value="nodeGroups">Knotengruppen</option></select></label></div>
    <div className="file-grid"><div className="file-list">{entries.filter(entry=>(kind === 'all' || entry.collection === kind) && entry.name.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de'))).sort((a,b)=>a.name.localeCompare(b.name,'de') || (b.version || 1)-(a.version || 1)).map(entry=><button className={deleting && selected === entry.id ? 'delete-armed' : ''} key={entry.id} aria-pressed={selected === entry.id} onClick={()=>setSelected(entry.id)} onDoubleClick={()=>onChoose(entry)}><strong>{entry.name}</strong><small>{entry.type} · Browser · v{entry.version || 1}</small><small>{entry.documentId || entry.id}</small></button>)}{!entries.length && <p>Noch keine gespeicherten Einträge.</p>}</div>
      <div className="file-preview"><Viewer plan={plan} catalog={catalog} blockFrame={chosen?.mode === 'form'} />{!plan && <p>{chosen?.document && chosen?.collection !== 'nodeGroups' ? 'Vorschau wird geladen oder ist ungültig.' : 'Für diesen Eintrag ist keine Vorschau gespeichert.'}</p>}</div></div>
    <p className={`file-status ${error || deleting ? 'error' : 'hint'}`} role="status" title={refs.join(', ')}>{error || (deleting ? refs.length ? `Löschen gesperrt: ${refs.join(', ')}` : 'Rot markierten Eintrag wirklich löschen? Erneut auf „Jetzt löschen“ klicken. Auswahlwechsel bricht ab.' : disabledReference || 'Gespeicherte Version öffnen oder als Copycat-Referenz in den Entwurf einfügen.')}</p>
    {editing && chosen && <JsonDialog mode={chosen.mode} document={entryPayload} library={chosen.library || baseLibrary} parse={chosen.collection === 'nodeGroups' ? value=>{if(value.mode!==chosen.mode) throw new Error('Die Knotengruppe gehört zum anderen Editor.');return validateNodeGroup(value)} : undefined} saveLabel="Neue Version speichern" onApply={saveDraft} onClose={()=>setEditing(false)} />}
    <footer><button onClick={onClose}>Schließen</button><button disabled={!chosen} onClick={()=>setEditing(true)}>JSON bearbeiten …</button><button className="danger" disabled={!chosen || Boolean(deleting && refs.length)} onClick={remove}>{deleting ? 'Jetzt löschen' : 'Löschen'}</button><button disabled={Boolean(disabledReference)} title={disabledReference || 'Genaue Version als Copycat-Knoten einfügen'} onClick={()=>onReference(chosen)}>Als Referenz einfügen</button><button className="primary" disabled={!chosen || readOnly && chosen?.collection === 'nodeGroups'} onClick={()=>onChoose(chosen)}>Öffnen / Einfügen</button></footer>
  </Modal>
}
export function JsonDialog({ mode, document, library, onApply, onClose, parse, saveLabel='Übernehmen' }) {
  const [text,setText]=useState(() => JSON.stringify(document,null,2)), [applyError,setError]=useState('')
  let error=applyError, candidate
  try {candidate=parse ? parse(JSON.parse(text)) : validateReferences(readGraph(JSON.parse(text),mode),library)} catch(e) {candidate=null; if (!error) error=e.message}
  return <Modal title="JSON-Arbeitskopie" onClose={onClose}><p>Übernahme prüft Syntax, Schema, Typen und Referenzen. Abbrechen verwirft die Arbeitskopie.</p><JsonEditor value={text} onChange={value=>{setText(value);setError('')}} /><p className={candidate ? 'hint' : 'error'} role="status">{candidate ? 'Arbeitskopie ist gültig.' : error}</p><footer><button onClick={onClose}>Abbrechen</button><button className="primary" disabled={!candidate} onClick={() => {try {onApply(candidate);onClose()} catch(e) {setError(e.message)}}}>{saveLabel}</button></footer></Modal>
}
