import { CopycatTransforms } from './CopycatTransforms.jsx'
import { FileDialog, JsonDialog } from './FileDialog.jsx'
import { appendVersion, identityOf } from './documents.js'
import { duplicateNodes, insertFormReference, savedReferences, viewLayout, versionResources } from './studio-actions.js'
import { portStyle, portStyles } from './port-styles.js'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useUpdateNodeInternals } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { editNativeGroup, previewGraph, adaptRectangles, newNode, starterBuilding } from './generated/engine.mjs'
import { applyWires, connections, formGroups, inspect, editNode, model, position, protectedNode, readGraph, replaceNodes, validateLibrary, writeGraph } from './model.js'
import { NativeDocumentFields } from './NativeFields.jsx'
import { DocumentFields, Field, names, NodeFields, portName } from './Inspector.jsx'
import './style.css'
import { SplitHandle } from './SplitHandle.jsx'
import { Workspace, useWorkspace } from './Workspace.jsx'
import { loadBuildingCopycat, loadFormCopycatWithMaterials } from './copycat-library.js'
import { applyCopycatOption } from './copycat-selection.js'
import { insertNodeGroup, mergeLibraries, saveNodeGroup } from './node-groups.js'
import baseLibrary from '../../examples/library.json'
import formExample from '../../examples/nodegraph-form.json'
import formRotation from '../../examples/nodegraph-rotation-xor.json'
import formMaterials from '../../examples/nodegraph-material-groups.json'
import buildingExample from '../../examples/building-graph.json'
import buildingAssembly from '../../examples/building-graph-assembly.json'
import buildingBasements from '../../examples/building-graph-basements.json'
import buildingRotationSegment from '../../examples/building-rotation-segment.json'
import buildingRoofPeak from '../../examples/building-roof-peak.json'
import buildingRoofEave from '../../examples/building-roof-eave.json'

const Preview = lazy(() => import('./Preview.jsx'))
const CopycatPicker = lazy(() => import('./CopycatPicker.jsx'))
const wiki = 'https://github.com/TeutonStudio/copycat-architect/wiki'
const examples = {
  form: [
    ['Aussparung', formExample], ['Rotation und Differenz', formRotation], ['Materialgruppen', formMaterials]
  ],
  building: [
    ['Gebäude aus Copycats', buildingAssembly], ['Rotationssegment · Säule', buildingRotationSegment], ['Dachspitze bei ungerader Breite', buildingRoofPeak], ['Dachendkante parallel zum First', buildingRoofEave], ['L-förmiges Gebäude', buildingExample], ['Gebäude mit Kellern', buildingBasements]
  ]
}
const query = new URLSearchParams(window.location.search)
const initialMode = query.get('editor') === 'form' || query.get('graph') === 'copycat' ? 'form' : 'building'

function DiagramNode({ id, data: { node, ports, groupName, outputType, hasOutput, diagnostic, reference }, selected }) {
  const updateInternals = useUpdateNodeInternals()
  const signature = ports.map(port => port.id).join('|')
  useEffect(() => updateInternals(id), [id, signature, updateInternals])
  const source = hasOutput ?? !['BUILDING', 'OUTPUT'].includes(node.kind)
  return <div className={`diagram-node ${selected ? 'selected' : ''} ${diagnostic ? 'invalid' : ''} ${source ? '' : 'result-node'}`}>
    <div className="node-heading">
      <span className="node-symbol">{source ? portStyle(outputType).symbol : '◆'}</span>
      <div><strong>{node.name || names[node.kind]}</strong><small>{node.name ? names[node.kind] : node.id}{groupName ? ` · ${groupName}` : ''}</small></div>
      {source && <Handle type="source" position={Position.Right} id="out" style={{background:portStyle(outputType).color}} aria-label={`Ausgang · ${outputType}`} title={`Ausgang · ${outputType}`} />}
    </div>
    {reference && <div className="node-reference" title={`${reference.documentId}@${reference.version}`}>↗ {reference.name} · v{reference.version}</div>}
    {diagnostic && <p className="node-diagnostic" role="alert" title={diagnostic}>⚠ {diagnostic}</p>}
    {ports.length > 0 && <div className="ports">{ports.map(port => <div className="port" key={port.id}>
      <Handle type="target" position={Position.Left} id={port.id} style={{background:portStyle(port.types?.[0]).color}} title={`${portName(port, node)} · ${(port.types || []).join(" / ")}`} />
      <span>{portName(port, node)}</span>
      <span className={`port-status ${port.source ? 'connected' : ''}`}>{port.source ? '●' : '○'}</span>
    </div>)}</div>}
  </div>
}

const nodeTypes = { architect: memo(DiagramNode) }
const edgeStyle = { stroke: '#8daeb1', strokeWidth: 1.7 }

function useHistory(initial) {
  const [state, setState] = useState(() => ({ current: initial, past: [], future: [] }))
  const push = next => setState(({ current, past }) => ({
    current: next, past: [...past.slice(-49), current], future: []
  }))
  const undo = () => setState(state => state.past.length ? {
    current: state.past.at(-1), past: state.past.slice(0, -1), future: [state.current, ...state.future]
  } : state)
  const redo = () => setState(state => state.future.length ? {
    current: state.future[0], past: [...state.past, state.current], future: state.future.slice(1)
  } : state)
  return { ...state, push, undo, redo, reset:next => setState({current:structuredClone(next),past:[],future:[]}) }
}

function downloadJson(document, mode) {
  const name = (document.name ?? 'copycat').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'copycat'
  const url = URL.createObjectURL(new Blob([JSON.stringify(document) + '\n'], { type: 'application/json' }))
  const link = window.document.createElement('a')
  link.href = url
  link.download = `${name}-${mode}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Studio({ mode, active }) {
  const { data: savedData, update: updateWorkspace } = useWorkspace()
  const draft = savedData.drafts[mode]
  const history = useHistory(draft?.document ?? examples[mode][0][1])
  const [fileIdentity,setFileIdentity] = useState(draft?.fileIdentity || null)
  const [draftIdentity,setDraftIdentity] = useState(draft?.fileIdentity || null)
  const [viewVersion,setViewVersion] = useState(null), [versionLayouts,setVersionLayouts] = useState({})
  const [draftLibrary,setLibrary] = useState(draft?.library ?? baseLibrary)
  const [draftMaterials,setMaterials] = useState(draft?.materials ?? {})
  const viewedEntry = savedData.graphs.find(entry => entry.id === viewVersion && entry.mode === mode)
  const readOnly = Boolean(viewedEntry)
  const document = useMemo(() => viewedEntry ? viewLayout(readGraph(viewedEntry.document,mode),versionLayouts[viewedEntry.id]) : history.current,[viewedEntry,versionLayouts,history.current,mode])
  const {library,materials} = versionResources(viewedEntry,draftLibrary,draftMaterials,baseLibrary)
  const versions = savedData.graphs.filter(entry => entry.mode === mode && identityOf(entry) === fileIdentity).sort((a,b)=>(a.version || 1)-(b.version || 1))
  useEffect(()=>{if(viewVersion && !viewedEntry) {setViewVersion(null);setFileIdentity(draftIdentity)}},[viewVersion,viewedEntry,draftIdentity])
  const [renaming,setRenaming] = useState(false), [nameDraft,setNameDraft] = useState(''), [groupName,setGroupName] = useState('Neue Gruppe')
  // A source change also changes material mappings and library snapshots.
  const historyContext = useRef(new WeakMap())
  const [selectedIds, setSelectedIds] = useState([])
  const onSelectionChange = useCallback(({ nodes }) => setSelectedIds(previous => {
    const next = nodes.map(node => node.id)
    return next.length === previous.length && next.every(id => previous.includes(id)) ? previous : next
  }), [])
  const [saveName, setSaveName] = useState('')
  const [fileDialog,setFileDialog] = useState(false), [jsonDialog,setJsonDialog] = useState(false)
  const [contextMenu,setContextMenu] = useState(null)
  useEffect(() => {
    updateWorkspace(data => {
      const previous = data.drafts[mode], document = history.current
      if(previous?.document === document && previous?.library === draftLibrary && previous?.materials === draftMaterials && previous?.fileIdentity === draftIdentity) return data
      const entry={mode,document,library:draftLibrary,materials:draftMaterials,fileIdentity:draftIdentity,references:savedReferences(document)}
      return {...data,drafts:{...data.drafts,[mode]:entry,[`${mode}:${draftIdentity || '_new'}`]:entry}}
    })
  }, [mode, history.current, draftLibrary, draftMaterials, draftIdentity])
  const [diagnostics,setDiagnostics] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedWire, setSelectedWire] = useState(null)
  const [dragging, setDragging] = useState({})
  const [message, setMessage] = useState(null)
  const [flow, setFlow] = useState(null)
  const [kind, setKind] = useState('')
  const [workspace, setWorkspace] = useState(0)
  // React Flow measurements belong to the view, never to the Minecraft document.
  const [nodeMeasurements, setNodeMeasurements] = useState({})
  const [graphShare, setGraphShare] = useState(68)
  const [previewShare, setPreviewShare] = useState(45)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [previewMode, setPreviewMode] = useState('graph')
  const [copycatPicker, setCopycatPicker] = useState(null)
  const graphInput = useRef(null)
  const libraryInput = useRef(null)
  const copycatInput = useRef(null)
  const canvas = useRef(null)
  const entries = useMemo(() => inspect(mode, document), [mode, document])
  const wires = useMemo(() => connections(entries), [entries])
  const current = entries.find(({ node }) => node.id === selected)
  const resultNode = entries.find(({ node }) => ['OUTPUT', 'BUILDING'].includes(node.kind) && !document.graph.nodeGroups?.some(group => group.nodes.includes(node.id)))
  const visibleNode = current ?? resultNode
  const kinds = mode === 'form' ? model.form.map(type => type.kind).filter(kind => kind !== 'OUTPUT') : model.building.filter(kind => kind !== 'BUILDING')
  const edgeId = ({ target, port }) => `${target}/${port}`
  const nodes = useMemo(() => entries.map(data => ({
    id: data.node.id, type: 'architect', data: { ...data, reference:document.graph.nodes.find(node=>node.id === data.node.id)?.libraryReference, diagnostic:diagnostics.find(item => item.nodeId === data.node.id)?.message, hasOutput: data.node.id !== resultNode.node.id, groupName: document.graph.nodeGroups?.find(group => group.nodes.includes(data.node.id))?.name },
    position: dragging[data.node.id] || { x: data.node.x, y: data.node.y },
    selected: selectedIds.includes(data.node.id),
    measured: nodeMeasurements[data.node.id]
  })), [entries, dragging, selectedIds, nodeMeasurements,diagnostics])
  const onNodesChange = useCallback(changes => {
    const measured = changes.filter(change => change.type === 'dimensions' && change.dimensions)
    if (!measured.length) return
    setNodeMeasurements(previous => {
      const ids = new Set(entries.map(({ node }) => node.id))
      let changed = false
      const next = Object.fromEntries(Object.entries(previous).filter(([id]) => ids.has(id)))
      changed = Object.keys(next).length !== Object.keys(previous).length
      for (const { id, dimensions } of measured) {
        if (!ids.has(id)) continue
        if (next[id]?.width !== dimensions.width || next[id]?.height !== dimensions.height) {
          next[id] = dimensions; changed = true
        }
      }
      return changed ? next : previous
    })
  }, [entries])
  const edges = useMemo(() => wires.map(wire => ({
    id: edgeId(wire), source: wire.source, sourceHandle: 'out', target: wire.target, targetHandle: wire.port,
    style: wire.source === 'empty_wall' ? { ...edgeStyle, opacity: 0.38 } : edgeStyle,
    selected: edgeId(wire) === selectedWire
  })), [wires, selectedWire])

  const transact = callback => {
    try {
      callback()
      setMessage(null)
    } catch (error) {
      setMessage({ error: true, text: error.message || String(error) })
    }
  }
  const commit = next => {
    if (readOnly) throw new Error('Gespeicherte Version: nur Betrachten. Zum Bearbeiten Ungespeichert wählen.')
    inspect(mode, next)
    if (JSON.stringify(next) !== JSON.stringify(document)) {
      historyContext.current.set(document, { library, materials })
      // Reopening the same example must create a distinct history entry.
      history.push(structuredClone(next))
    }
  }
  const travelHistory = direction => {
    if (readOnly) return
    const next = direction === 'undo' ? history.past.at(-1) : history.future[0]
    if (!next) return
    historyContext.current.set(document, { library, materials })
    const context = historyContext.current.get(next)
    if (context) { setLibrary(context.library); setMaterials(context.materials) }
    history[direction]();setSelectedIds(ids=>ids.filter(id=>next.graph.nodes.some(node=>node.id === id)));setSelected(id=>next.graph.nodes.some(node=>node.id === id) ? id : null)
  }
  const patchNode = patch => transact(() => {
    const { node } = visibleNode
    let updated = { ...document.graph.nodes.find(item => item.id === node.id), ...patch }
    commit(editNode(mode, document, updated))
  })
  const setWire = (target, port, source) => transact(() => {
    const rest = wires.filter(wire => wire.target !== target || wire.port !== port)
    commit(applyWires(mode, document, entries, source ? [...rest, { source, target, port }] : rest))
    setSelectedWire(null)
  })
  const editableIds = (selectedIds.length ? selectedIds : selected ? [selected] : []).filter(id => document.graph.nodes.some(node => node.id === id && !protectedNode(node)))
  const removeSelection = () => {
    if(readOnly) return
    const wire = selectedIds.length < 2 && wires.find(wire => edgeId(wire) === selectedWire)
    if (wire) setWire(wire.target,wire.port,'')
    else if(editableIds.length) transact(() => {
      const removed=new Set(editableIds)
      commit(applyWires(mode,document,entries,wires.filter(wire=>!removed.has(wire.source) && !removed.has(wire.target)),editableIds))
      setSelected(null);setSelectedIds([]);setSelectedWire(null)
    })
  }
  const open = raw => {
    setFileIdentity(null);setDraftIdentity(null);setSaveName('');setFileDialog(false)
    setViewVersion(null);history.reset(readGraph(raw, mode));setLibrary(baseLibrary);setMaterials({})
    setSelected(null)
    setSelectedWire(null)
    setSelectedIds([])
    setNodeMeasurements({})
    setWorkspace(key => key + 1)
  }
  const add = () => transact(() => {
    if (!kind) return
    const { left, top, width, height } = canvas.current.getBoundingClientRect()
    const center = flow?.screenToFlowPosition({ x: left + width * 0.5, y: top + height * 0.4 }) ?? { x: 50, y: 50 }
    const id = `node_${crypto.randomUUID().slice(0, 13)}`
    const node = newNode(mode === 'building', kind, id, position(center.x), position(center.y), true)
    if (kind === 'INPUT') node.part.group = formGroups(document)[0].id
    commit(replaceNodes(document, [...document.graph.nodes, node]))
    setSelected(id)
    setSelectedIds([id])
    setSelectedWire(null)
  })
  const onDrag = useCallback((_, node, moved) => setDragging(Object.fromEntries((moved?.length ? moved : [node]).map(item=>[item.id,item.position]))), [])
  const onDragStop = (_, node, moved) => {
    const positions=Object.fromEntries((moved?.length ? moved : [node]).map(item=>[item.id,{x:position(item.position.x),y:position(item.position.y)}]))
    setDragging({})
    if(readOnly) {setVersionLayouts(current=>({...current,[viewedEntry.id]:{...current[viewedEntry.id],...positions}}));return}
    transact(() => commit(replaceNodes(document,document.graph.nodes.map(item=>positions[item.id] ? {...item,...positions[item.id]} : item))))
  }
  const compatible = ({ source, target, targetHandle }) => {
    const port = entries.find(({ node }) => node.id === target)?.ports.find(port => port.id === targetHandle)
    const sourceKind = entries.find(({ node }) => node.id === source)?.node.kind
    return source !== target && Boolean(port?.accepts.includes(sourceKind))
  }
  const importFile = async (event, isLibrary) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 16_000_000) throw new Error('Die JSON-Datei ist größer als 16 MB.')
      const raw = JSON.parse(await file.text())
      if (isLibrary) {
        const imported = validateLibrary(raw)
        setLibrary({ forms: { ...baseLibrary.forms, ...imported.forms }, modules: { ...baseLibrary.modules, ...imported.modules } })
      }
      else open(raw)
      setMessage({ text: `${file.name} geöffnet` })
    } catch (error) {
      setMessage({ text: error.message, error: true })
    }
  }

  const loadCopycat = (entry, nodeId = visibleNode.node.kind === 'COPYCAT' || visibleNode.node.kind === 'SAVED' ? visibleNode.node.id : undefined) => {
    if (mode === 'building') {
      const result = loadBuildingCopycat(document, library, entry, nodeId)
      commit(result.document); setLibrary(result.library); setSelected(result.nodeId)
    } else {
      const result = loadFormCopycatWithMaterials(document, entry, nodeId, materials)
      commit(result.document); setMaterials(result.materials); setSelected(result.nodeId)
    }
  }
  const savedForms = useMemo(() => savedData.graphs.filter(entry => entry.mode === 'form'), [savedData.graphs])
  const chooseCopycat = nodeId => {
    if (readOnly) return
    setFileDialog(false)
    const node = entries.find(entry => entry.node.id === nodeId)?.node
    const initialId = node?.kind === 'INPUT' ? `base:${node.part.source}` : node?.kind === 'COPYCAT' ? `library:${node.form}` : null
    setCopycatPicker({ nodeId, initialId, initialCategory: node && node.kind !== 'INPUT' ? 'saved' : 'basic' })
  }
  const applyCopycat = option => {
    const result = applyCopycatOption({ mode, document, library, materials, nodeId: copycatPicker.nodeId, option })
    const next={...result.document,graph:{...result.document.graph,nodes:result.document.graph.nodes.map(node=>{if(node.id !== result.nodeId) return node;const {libraryReference,...copy}=node;return copy})}}
    commit(next)
    setLibrary(result.library); setMaterials(result.materials); setSelected(result.nodeId); setSelectedIds([result.nodeId])
    setSelectedWire(null); setMessage(null)
  }
  const count = entries.length
  const maxNodes = mode === 'form' ? model.formNodes : model.buildingNodes
  const portLimits = mode === 'form' ? model.form.find(type => type.kind === visibleNode.node.kind)
    : model.buildingInputs[visibleNode.node.kind] ?? null
  const isFormSourceLimit = ['INPUT', 'SAVED'].includes(kind) && entries.filter(({ node }) => ['INPUT', 'SAVED'].includes(node.kind)).length >= model.formSources
  const previewSelected = current?.node.id ?? ''
  const exportFile = () => transact(() => downloadJson(writeGraph(mode, document), mode))
  const copyJson = async () => {
    try {
      const json = JSON.stringify(writeGraph(mode, document))
      await navigator.clipboard.writeText(json)
      setMessage({ text: 'Minecraft-JSON kopiert. Im passenden Editor im Spiel importieren.' })
    } catch (error) {
      setMessage({ error: true, text: `JSON konnte nicht kopiert werden: ${error.message || String(error)}. Nutze alternativ JSON exportieren.` })
    }
  }
  const duplicate = (withConnections=true) => transact(() => {
    if (readOnly || !editableIds.length) return
    const copies=editableIds.map(() => crypto.randomUUID())
    commit(duplicateNodes(mode,document,editableIds,copies,withConnections));setSelectedIds(copies);setSelected(copies[0]);setContextMenu(null)
  })
  const makeGroup = () => transact(() => {
    if(readOnly || !editableIds.length) return
    commit({...document,graph:editNativeGroup(mode === 'building',document,'create','',groupName,editableIds)})
  })
  const saveGroup = () => transact(() => {
    if(readOnly || !editableIds.length) return
    const entry=saveNodeGroup(mode,document,editableIds,groupName,materials,library)
    if(entry.nodes.length === 1) {try {entry.preview=previewGraph(mode === 'building',document,library,entry.nodes[0].id,materials);if(mode === 'form') entry.preview.meshes=entry.preview.meshes.map(mesh=>({...mesh,material:materials[mesh.material] || mesh.material}))} catch {}}
    const existing=savedData.nodeGroups.find(item=>item.mode === mode && item.name === entry.name)
    updateWorkspace(data=>({...data,nodeGroups:appendVersion(data.nodeGroups,{...entry,document},existing ? identityOf(existing) : null)}))
    setMessage({text:'Knotengruppe in der Bibliothek gespeichert.'})
  })
  const save = (asNew = false) => transact(() => {
    if(readOnly && !asNew) return
    const name=saveName.trim() || document.name || 'Graph'
    if(savedData.graphs.length >= 500) throw new Error('Höchstens 500 Speicherstände. Nicht benötigte Versionen zuerst löschen.')
    const identity=asNew ? null : fileIdentity
    const next=appendVersion(savedData.graphs,{name,mode,document:writeGraph(mode,{...document,name}),library,materials,references:savedReferences(document)},identity)
    const entry=next.at(-1)
    updateWorkspace(data => ({...data,graphs:appendVersion(data.graphs,{...entry},identity || entry.documentId)}))
    if(readOnly) {history.reset({...document,name});setLibrary(library);setMaterials(materials);setViewVersion(null)}
    setFileIdentity(entry.documentId);setDraftIdentity(entry.documentId);setMessage({text:`${name} · Version ${entry.version} gespeichert.`})
  })
  const openEntry = entry => transact(() => {
    if(entry.collection === 'nodeGroups') {
      const inserted=insertNodeGroup(document,entry);commit(inserted.document);setLibrary(mergeLibraries(library,entry.library));setMaterials(current => ({...current,...inserted.materials}))
    } else if(entry.mode !== mode && entry.mode === 'form') {
      if(readOnly) return
      loadCopycat(entry,undefined)
    } else {
      const identity=identityOf(entry)
      setViewVersion(entry.id);setFileIdentity(identity);setSaveName(entry.name);setSelected(null);setSelectedIds([]);setSelectedWire(null);setWorkspace(key=>key+1)
    }
    setFileDialog(false)
  })
  const selectVersion = id => {
    if(!id && fileIdentity !== draftIdentity) {
      const parked=savedData.drafts[`${mode}:${fileIdentity || '_new'}`], baseline=viewedEntry || versions.at(-1)
      if(parked || baseline) {
        history.reset(parked?.document || readGraph(baseline.document,mode));setLibrary(parked?.library || baseline?.library || baseLibrary);setMaterials(parked?.materials || baseline?.materials || {});setDraftIdentity(fileIdentity)
      }
    }
    setViewVersion(id || null);setRenaming(false);setSelectedWire(null);setContextMenu(null)
  }
  const insertReference = entry => transact(() => {
    if(readOnly) return
    const result=insertFormReference({mode,document,library,materials,entry,currentIdentity:fileIdentity})
    commit(result.document);setLibrary(result.library);setMaterials(result.materials);setSelected(result.nodeId);setSelectedIds([result.nodeId]);setSelectedWire(null);setFileDialog(false);setWorkspace(key=>key+1)
  })
  const rename = () => transact(() => {
    const name=nameDraft.trim()
    if(!name || name.length>64 || /[\x00-\x1f]/.test(name)) throw new Error('Der Name benötigt 1–64 sichtbare Zeichen.')
    commit({...document,name});setSaveName(name);setRenaming(false)
  })
  const keydown = event => {
    if (event.target.closest('input, textarea, select, [contenteditable=true]')) return
    if(readOnly) {if(['Delete','Backspace'].includes(event.key) || (event.ctrlKey || event.metaKey) && ['d','z','y'].includes(event.key.toLowerCase())) event.preventDefault();return}
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicate(); return }
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault()
      if (event.shiftKey || event.key.toLowerCase() === 'y') travelHistory('redo')
      else travelHistory('undo')
    }
    if (['Delete', 'Backspace'].includes(event.key) && (selected || selectedWire || selectedIds.length)) {
      event.preventDefault()
      removeSelection()
    }
  }
  useEffect(() => {
    if(!active) return
    const handler=event=>{if(window.document.querySelector('dialog[open],.library-overlay,[role="dialog"]')) return;keydown(event)}
    window.addEventListener('keydown',handler)
    return ()=>window.removeEventListener('keydown',handler)
  },[active,keydown])
  return <div className="studio" hidden={!active}>
    {fileDialog && <FileDialog mode={mode} currentIdentity={fileIdentity} readOnly={readOnly} onChoose={openEntry} onReference={insertReference} onClose={() => setFileDialog(false)} actions={<>    <div className="toolbar">
      <label className="example-select"><span>BEISPIELE</span><select aria-label="Beispiel öffnen" value="" onChange={e => transact(() => open(examples[mode][Number(e.target.value)][1]))}>
        <option value="" disabled>Beispiel öffnen</option>
        {examples[mode].map(([name], i) => <option key={name} value={i}>{name}</option>)}
      </select></label>
      <button type="button" onClick={() => transact(() => open(mode === 'building' ? starterBuilding() :
        { schema: 3, name: 'Neue Form', parts: [{ source: 'copycats:copycat_slice' }] }))}>Neu</button>


      <button type="button" disabled={readOnly} onClick={() => chooseCopycat(['INPUT', 'SAVED', 'COPYCAT'].includes(current?.node.kind) ? current.node.id : undefined)}>Copycat auswählen</button>
      {mode === 'building' && <>
        <button type="button" disabled={readOnly} onClick={() => copycatInput.current.click()}>Copycat laden</button>

        <button type="button" disabled={readOnly} onClick={() => libraryInput.current.click()}>Bibliothek öffnen</button>

      </>}
      <button type="button" onClick={() => graphInput.current.click()}>Import …</button><button type="button" className="primary" onClick={exportFile}>Export …</button><button type="button" disabled={readOnly} onClick={() => setJsonDialog(true)}>JSON bearbeiten</button>
      <button type="button" onClick={copyJson}>Minecraft-JSON kopieren</button>
      <span className="toolbar-spacer" />
      <button type="button" aria-label="Rückgängig" title="Rückgängig" disabled={readOnly || !history.past.length} onClick={() => travelHistory('undo')}>↶</button>
      <button type="button" aria-label="Wiederholen" title="Wiederholen" disabled={readOnly || !history.future.length} onClick={() => travelHistory('redo')}>↷</button>
    </div>

    <div className="personal-library-bar">
      <label>Name für Bibliothek<input aria-label="Name für Bibliothek" placeholder={document.name || 'Mein Entwurf'} maxLength={64} value={saveName} onChange={event => setSaveName(event.target.value)} /></label>
      <button disabled={readOnly} onClick={() => save()}>Speichern</button><button onClick={() => save(true)}>Speichern unter …</button>

    </div>

</>} />}
    {jsonDialog && <JsonDialog {...{mode,document,library}} onApply={next => commit(next)} onClose={() => setJsonDialog(false)} />}
    {contextMenu && <div className="context-menu" role="menu" style={{left:contextMenu.x,top:contextMenu.y}}><button role="menuitem" disabled={readOnly || !editableIds.length} onClick={()=>duplicate(true)}>Mit Verbindungen duplizieren · Strg+D</button><button role="menuitem" disabled={readOnly || !editableIds.length} onClick={()=>duplicate(false)}>Ohne Verbindungen duplizieren</button><button role="menuitem" onClick={() => setContextMenu(null)}>Schließen</button></div>}
<input hidden ref={graphInput} type="file" accept=".json,application/json" onChange={event => importFile(event, false)} /><input hidden ref={copycatInput} type="file" accept=".json,application/json" onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
          try {
            if (file.size > 4_000_000) throw new Error('Die Copycat-Datei ist größer als 4 MB.')
            const source = readGraph(JSON.parse(await file.text()), 'form')
            transact(() => loadCopycat({ id: crypto.randomUUID(), name: source.name, document: source }))
          } catch(error) { setMessage({ text: error.message, error: true }) }
        }} /><input hidden ref={libraryInput} type="file" accept=".json,application/json" onChange={event => importFile(event, true)} />
    <div className="workbench" style={{ '--graph-share': `${graphShare}fr`, '--side-share': `${100 - graphShare}fr` }}>
      <section className="canvas-panel" aria-label="Graph bearbeiten">
        <div className="panel-heading graph-heading">
          <div className="graph-identity">
            {renaming ? <form className="graph-rename" onSubmit={event=>{event.preventDefault();rename()}}><input autoFocus aria-label="Graphname" maxLength={64} value={nameDraft} onChange={event=>setNameDraft(event.target.value)} onKeyDown={event=>{if(event.key === 'Escape') setRenaming(false)}}/><button aria-label="Name übernehmen">✓</button></form> : <strong className="graph-name" title={viewedEntry?.name || document.name}>{viewedEntry?.name || document.name || 'Entwurf'}</strong>}
            <button type="button" disabled={readOnly} aria-label="Graphnamen ändern" title="Graphnamen ändern" onClick={()=>{setNameDraft(document.name || '');setRenaming(true)}}>✎</button>
            <select aria-label="Graphversion" value={viewedEntry?.id || ''} onChange={event=>selectVersion(event.target.value)}><option value="">Ungespeichert</option>{versions.map(entry=><option key={entry.id} value={entry.id}>v{entry.version || 1}</option>)}</select>
            <button type="button" onClick={()=>setFileDialog(true)}>Bibliothek</button>
            <small>{count} / {maxNodes}{readOnly ? ' · Betrachten' : ''}</small>
          </div>
          <div className="button-row">
            <select disabled={readOnly} aria-label="Knotentyp" value={kind} onChange={event => setKind(event.target.value)}>
              <option value="" disabled>Knotentyp</option>
              {kinds.map(kind => <option key={kind} value={kind}>{names[kind]}</option>)}
            </select>
            <button type="button" disabled={readOnly || !kind || count >= maxNodes || isFormSourceLimit} onClick={add}>+ Knoten</button>
          </div>
        </div>
        <div className="canvas" ref={canvas}>
          {active && <ReactFlow key={workspace} nodes={nodes} onNodesChange={onNodesChange} edges={edges} nodeTypes={nodeTypes} onInit={setFlow}
            fitView fitViewOptions={{ padding: 0.15, maxZoom: 1.1 }} minZoom={0.13} maxZoom={2}
            onNodeDrag={onDrag} onNodeDragStop={onDragStop} deleteKeyCode={null} nodesConnectable={!readOnly} edgesReconnectable={false}
            onNodeContextMenu={(event,node) => {event.preventDefault();if (!selectedIds.includes(node.id)) {setSelectedIds([node.id]);setSelected(node.id)}setContextMenu({x:Math.min(event.clientX,window.innerWidth-220),y:Math.min(event.clientY,window.innerHeight-90)})}}
            onNodeClick={(event, node) => { setSelected(node.id); setSelectedWire(null); setSelectedIds(ids => event.shiftKey ? ids.includes(node.id) ? ids.filter(id => id !== node.id) : [...ids, node.id] : [node.id]) }}
            onEdgeClick={(_, edge) => { setSelectedWire(edge.id); setSelected(edge.target) }}
            onPaneClick={() => { setContextMenu(null);setSelected(null); setSelectedWire(null); setSelectedIds([]) }}
            isValidConnection={compatible} onConnect={wire => setWire(wire.target, wire.targetHandle, wire.source)}
            selectionKeyCode="Shift" multiSelectionKeyCode="Shift" onSelectionChange={onSelectionChange} onlyRenderVisibleElements
            colorMode="dark" aria-label="React-Flow-Graph">
            <Background gap={22} size={1} color="#46606d" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="#659a9c" maskColor="#18232c88" />
          </ReactFlow>}
        </div>
        <details className="port-legend"><summary>Anschlüsse · Legende</summary><ul>{Object.entries(portStyles).map(([key,style]) => <li key={key}><span style={{color:style.color}}>{style.symbol}</span>{style.name}</li>)}</ul><small>X / Y / Z kennzeichnen zusätzlich die Achsen. Die Typregeln bestimmen die Verbindung.</small></details>
        <div className={`canvas-footer ${message?.error ? 'error' : ''}`} role="status">
          {message?.text ?? (readOnly ? 'Gespeicherte Version · Betrachten · Knotenpositionen ändern nur die Ansicht' : 'Knoten ziehen · Anschlüsse verbinden · Entf löscht die Auswahl')}
        </div>
      </section>
      <SplitHandle axis="x" value={graphShare} onChange={setGraphShare} label="Breite von Graph und Seitenleiste" />
      <div className={`side${previewCollapsed && inspectorCollapsed ? ' both-collapsed' : ''}`}
        style={{ gridTemplateRows: previewCollapsed && inspectorCollapsed ? 'auto auto' : previewCollapsed ? 'auto minmax(0, 1fr)' : inspectorCollapsed ? 'minmax(0, 1fr) auto' : `minmax(0, ${previewShare}fr) 10px minmax(0, ${100-previewShare}fr)` }}>
        {active && <Suspense fallback={<section className="preview-panel"><div className="preview-meta">3D-Vorschau wird geladen …</div></section>}>
          <Preview onDiagnostics={setDiagnostics} mode={mode} document={document} library={library} selected={previewSelected} materials={materials}
            previewMode={previewMode} onMode={setPreviewMode} collapsed={previewCollapsed} onToggle={() => setPreviewCollapsed(value => !value)} />
        </Suspense>}
        {!previewCollapsed && !inspectorCollapsed && <SplitHandle axis="y" value={previewShare} onChange={setPreviewShare} label="Höhenverhältnis von 3D-Vorschau und Inspektor" />}
        <section className={`inspector${inspectorCollapsed ? ' is-collapsed' : ''}`} aria-label="Knoteninspektor">
          <div className="panel-heading"><span>Inspektor</span><div className="button-row"><small>{current ? 'AUSWAHL' : 'ERGEBNIS'}</small>
            <button type="button" aria-expanded={!inspectorCollapsed} aria-controls={`${mode}-inspector`} aria-label={inspectorCollapsed ? 'Inspektor ausklappen' : 'Inspektor einklappen'} onClick={() => setInspectorCollapsed(value => !value)}>{inspectorCollapsed ? '▸' : '▾'}</button>
          </div></div>
          <div id={`${mode}-inspector`} className="inspector-body" hidden={inspectorCollapsed} key={visibleNode.node.id}>
            {selectedIds.length > 1 ? <section className="collection-data" aria-label="Sammlungsdaten"><h2>Sammlungsdaten</h2><p>{selectedIds.length} Knoten ausgewählt · {editableIds.length} bearbeitbar</p><fieldset disabled={readOnly || !editableIds.length} className="inspector-controls"><div className="collection-actions">
              <button className="danger" onClick={removeSelection}>Auswahl löschen</button>
              <button onClick={()=>duplicate(false)}>Duplizieren ohne Verbindungen</button>
              <button onClick={()=>duplicate(true)}>Duplizieren mit Verbindungen</button>
              <label>Gruppenname<input value={groupName} maxLength={64} onChange={event=>setGroupName(event.target.value)}/></label>
              <button onClick={makeGroup}>Zu eigener Gruppe machen</button><button onClick={saveGroup}>Knotengruppe speichern</button>
            </div></fieldset></section> : <>
            {readOnly && <p className="hint">Gespeicherte Version · nur Betrachten. Positionen sind Ansichtsänderungen.</p>}
            {document.graph.nodes.find(node=>node.id === visibleNode.node.id)?.libraryReference && <p className="hint">Referenz: {document.graph.nodes.find(node=>node.id === visibleNode.node.id).libraryReference.name} · v{document.graph.nodes.find(node=>node.id === visibleNode.node.id).libraryReference.version}</p>}
            <fieldset className="inspector-controls" disabled={readOnly}>
            <a className="reference-link" href={`${wiki}/Knoten-${mode === 'form' ? 'Formgraph' : 'Gebaeudegraph'}#${visibleNode.node.kind.toLowerCase()}`}>Knotenreferenz ↗</a>
            <h2>{visibleNode.node.name || names[visibleNode.node.kind]}</h2>
            <div className="node-id">{visibleNode.node.id} · Ausgang: {visibleNode.outputType || 'Ergebnis'}</div>
            {visibleNode.ports.length > 0 && <details open><summary>Verbindungen</summary>
              {visibleNode.ports.map(port => <Field key={port.id} label={portName(port, visibleNode.node)}
                value={port.source} options={[[ '', 'Offen' ], ...entries.filter(({ node }) =>
                  port.accepts.includes(node.kind) && node.id !== visibleNode.node.id)
                  .map(({ node }) => [node.id, node.name || `${names[node.kind]} · ${node.id}`])]}
                onChange={source => setWire(visibleNode.node.id, port.id, source)} />)}
              {portLimits && portLimits.min !== portLimits.max && <div className="button-row">
                <button type="button" disabled={visibleNode.node.inputs.length >= portLimits.max}
                  onClick={() => patchNode({ inputs: [...visibleNode.node.inputs, ''] })}>+ Eingang</button>
                <button type="button" disabled={visibleNode.node.inputs.length <= portLimits.min}
                  onClick={() => patchNode({ inputs: visibleNode.node.inputs.slice(0, -1),
                    ...(mode === 'form' ? { inputGroups: visibleNode.node.inputGroups.slice(0, visibleNode.node.inputs.length - 1) } : {})
                  })}>Letzten Eingang entfernen</button>
              </div>}
            </details>}
            <NodeFields {...{ mode, node: visibleNode.node, document, edit: patchNode, library }}
              onInspectNode={id => { setSelected(id); setSelectedIds([id]); setSelectedWire(null) }}
              onChooseCopycat={() => chooseCopycat(visibleNode.node.id)}
              onImportCopycat={() => copycatInput.current.click()} />
            {(selectedWire || current && !protectedNode(current.node)) &&
              <button className="danger" type="button" onClick={removeSelection}>{selectedWire ? 'Verbindung trennen' : 'Knoten löschen'}</button>}
            {visibleNode && (visibleNode.outputType === 'shape' || visibleNode.outputType?.startsWith('COPYCAT') || ['ROTATION','POSITION'].includes(visibleNode.node.kind)) && <CopycatTransforms node={visibleNode.node} edit={patchNode} primary />}
            <NativeDocumentFields {...{ mode, document }} selection={selectedIds} edit={next => transact(() => commit(next))} />
            <DocumentFields {...{ mode, document, library, materials, setMaterials }} edit={next => transact(() => commit(next))} />
            </fieldset></>}
          </div>
        </section>
      </div>
    </div>
    {copycatPicker && <Suspense fallback={<p className="copycat-loading" role="status">Copycat-Auswahl wird geladen …</p>}>
      <CopycatPicker {...copycatPicker} mode={mode} savedForms={savedForms} library={library}
        onChoose={applyCopycat} onClose={() => setCopycatPicker(null)} />
    </Suspense>}
  </div>
}

function App() {
  const { openPanel } = useWorkspace()
  const [mode, setMode] = useState(initialMode)
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('graph')
    url.searchParams.set('editor', mode)
    window.history.replaceState(null, '', url)
  }, [mode])
  return <>
    <header className="page-header">
      <div className="brand-mark" aria-hidden="true">⬡</div>
      <div className="brand"><a href="../">TEUTONSTUDIO · Graphstudio</a><span>COPYCAT ARCHITECT · {model.release}{import.meta.env.VITE_STUDIO_CHANNEL === 'internal' && ' · Entwicklung'}</span><h1>Form &amp; Gebäude</h1></div>
      <nav aria-label="Graph auswählen">
        <button type="button" aria-pressed={mode === 'form'} onClick={() => setMode('form')}>Formgraph</button>
        <button type="button" aria-pressed={mode === 'building'} onClick={() => setMode('building')}>Gebäudegraph</button>
      </nav>
      <button type="button" onClick={() => openPanel('materials')}>Meine Bibliotheken</button>
      <a href={wiki}>Zum Wiki ↗</a>
    </header>
    <main>
      <Studio mode="form" active={mode === 'form'} />
      <Studio mode="building" active={mode === 'building'} />
    </main>
  </>
}

createRoot(document.getElementById('root')).render(<Workspace><App /></Workspace>)
