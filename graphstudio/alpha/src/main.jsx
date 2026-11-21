import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, applyNodeChanges, useUpdateNodeInternals } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { clone, connect, download, duplicateSelection, edge, emptyGraph, extractGroup, graphOf, installer, makeGroup, newProject, node, removeNodes, STORAGE_KEY, updateGraph, uuid, validateProject } from "./project.js";
import { readWorkspace, saveWorkspace } from "./workspace.js";
import "./style.css";
const colors = { CONTROL: "#e9edf3", EVENT: "#b995ef", BOOLEAN: "#e17583", NUMBER: "#8baef0", INTEGER: "#8baef0", STRING: "#e6bd78", TABLE: "#66c9b1", PERIPHERAL_HANDLE: "#d49b74", ANY: "#b0bac9", NIL: "#8e98aa", VECTOR: "#77b8d7", MATRIX: "#77b8d7" };
const color = (p) => colors[p.kind === "DATA" ? p.dataType : p.kind] || "#7dc7ab";
const typeLabel = { NUMBER: "Zahl", INTEGER: "Ganzzahl", STRING: "Text", BOOLEAN: "Wahrheitswert", TABLE: "Tabelle", PERIPHERAL_HANDLE: "Ger\xE4t", ANY: "Beliebig", NIL: "nil", VECTOR: "Vektor", MATRIX: "Matrix" };
const symbols = { CONTROL: "\u25CB", EVENT: "\u25C7", BOOLEAN: "\u25CF", NUMBER: "#", INTEGER: "#", STRING: "T", TABLE: "\u25A4", PERIPHERAL_HANDLE: "\u2318", ANY: "\xB7" };
function Icon({ name, size = 18 }) {
  const paths = { grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z", code: "m8 5-6 7 6 7 m8-14 6 7-6 7 M14 3l-4 18", cube: "m12 2 10 5v10l-10 5L2 17V7z M2 7l10 5 10-5 M12 12v10", plus: "M12 5v14 M5 12h14", download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5", upload: "M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5", save: "M4 3h14l3 3v15H3V3z M7 3v6h10V3 M7 21v-8h10v8", undo: "M9 4 3 10l6 6 M3 10h10c6 0 8 8 2 10", redo: "m15 4 6 6-6 6 M21 10h-10c-6 0-8 8-2 10", search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6", close: "m5 5 14 14 M19 5 5 19", folder: "M3 6V4h7l2 3h9v14H3z", group: "M3 3h6v6H3z M15 3h6v6h-6z M9 16h6v6H9z M6 9v4h12V9 M12 13v3", check: "m4 12 5 5L20 6", warning: "M12 3 1 21h22z M12 9v5 M12 17v1", trash: "M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7", copy: "M9 9h12v12H9z M15 9V3H3v12h6", clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M12 6v6l4 2", external: "M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7", chevron: "m9 5 7 7-7 7", settings: "M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6" };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid} /></svg>;
}
function Button({ icon, children, className = "", ...props }) {
  return <button className={`button ${className}`} aria-label={typeof children === "string" ? children : void 0} {...props}>{icon && <Icon name={icon} />}<span>{children}</span></button>;
}
function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    const listener = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const list = [...ref.current.querySelectorAll("button,input,select,textarea,a[href]")].filter((e2) => !e2.disabled);
        if (!list.length) return;
        const index = list.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) {
          e.preventDefault();
          list.at(-1).focus();
        } else if (!e.shiftKey && index === list.length - 1) {
          e.preventDefault();
          list[0].focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}><section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}><header><h2>{title}</h2><button className="icon-button" title="Schließen" onClick={onClose}><Icon name="close" /></button></header>{children}</section></div>;
}
function GraphNode({ id, data, selected }) {
  const update = useUpdateNodeInternals(), d = data.definition;
  const signature = JSON.stringify(d?.pins);
  useEffect(() => update(id), [id, signature, update]);
  const inputs = d?.pins.filter((p) => p.direction === "INPUT") || [], outputs = d?.pins.filter((p) => p.direction === "OUTPUT") || [], rows = Math.max(inputs.length, outputs.length);
  return <div className={`graph-node ${selected ? "selected" : ""} ${data.error ? "invalid" : ""} ${data.group ? "group-node" : ""}`}>
    <div className="graph-node-heading"><span className="node-mark" style={{ color: data.group ? "#b995ef" : color(d?.pins.find((p) => p.kind === "DATA") || { kind: "CONTROL" }) }}>{data.group ? <Icon name="group" size={17} /> : symbols[d?.pins.find((p) => p.kind === "DATA")?.dataType] || "\u25CB"}</span><div><strong>{data.node.label || data.group?.name || d?.title || data.node.type}</strong><small>{data.group ? `${data.group.stateful ? "Zustandsgruppe" : "Funktion"} \xB7 v${data.group.version}` : d?.category || "Unbekannter Typ"}</small></div></div>
    <div className="node-pins">{Array.from({ length: rows }, (_, i) => <div className="pin-row" key={i}>{inputs[i] ? <span className="pin-label input" title={`${inputs[i].title} \xB7 ${typeLabel[inputs[i].dataType] || inputs[i].kind}`}><Handle type="target" position={Position.Left} id={inputs[i].id} style={{ background: color(inputs[i]) }} aria-label={`Eingang ${inputs[i].title}`} />{inputs[i].title}</span> : <span />}{outputs[i] ? <span className="pin-label output" title={`${outputs[i].title} \xB7 ${typeLabel[outputs[i].dataType] || outputs[i].kind}`}>{outputs[i].title}<Handle type="source" position={Position.Right} id={outputs[i].id} style={{ background: color(outputs[i]) }} aria-label={`Ausgang ${outputs[i].title}`} /></span> : <span />}</div>)}</div>
    {data.node.type === "raw.lua" && <div className="node-summary">{String(data.node.params.code || "Lua-Code").split("\n")[0].slice(0, 42)}</div>}
    {data.error && <div className="node-error">{data.error}</div>}
  </div>;
}
const nodeTypes = { studio: GraphNode };
function groupDefinition(group) {
  return { id: `function.card.${group.id}`, title: group.name, category: "Eigene Knotengruppen", defaultParams: {}, pins: [{ id: "in", title: "Eingang", direction: "INPUT", kind: "CONTROL" }, ...group.parameters.map((p) => ({ ...p, title: p.displayName, dataType: p.dataType, direction: "INPUT", kind: "DATA" })), ...group.returns.map((p) => ({ ...p, title: p.displayName, dataType: p.dataType, direction: "OUTPUT", kind: "DATA" })), { id: "next", title: "Weiter", direction: "OUTPUT", kind: "CONTROL" }] };
}
function definitionsFor(project, graph, catalog, result, cardId) {
  const base = new Map(catalog.definitions.map((d) => [d.id, d]));
  for (const g of project.groups) base.set(`function.card.${g.id}`, groupDefinition(g));
  const resolved = new Map((result?.resolved?.[cardId] || []).map((n) => [n.id, n.definition]));
  return new Map(graph.nodes.map((n) => [n.id, resolved.get(n.id) || base.get(n.type)]));
}
function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function ParamInput({ name, value, type, onChange }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  if (["TABLE", "PERIPHERAL_HANDLE", "VECTOR", "MATRIX"].includes(type)) return <span className="muted small">Mit einem passenden Datenknoten verbinden.</span>;
  if (type === "BOOLEAN" || typeof value === "boolean") return <select value={String(value ?? false)} onChange={(e) => onChange(e.target.value === "true")}><option value="true">Wahr</option><option value="false">Falsch</option></select>;
  if (typeof value === "number" || ["NUMBER", "INTEGER"].includes(type)) return <input type="number" step={type === "INTEGER" ? 1 : "any"} value={draft} onChange={(e) => {
    setDraft(e.target.value);
    if (e.target.value !== "" && Number.isFinite(Number(e.target.value))) onChange(Number(e.target.value));
  }} />;
  if (["code", "rawArguments", "rawValues"].includes(name)) return <textarea spellCheck="false" className="code-input" rows={name === "code" ? 9 : 3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  return <input spellCheck={false} value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}
const paramLabels = { code: "Lua-Code", name: "Lua-Variablenname", function: "Lua-Funktion", callSymbol: "Lua-Funktion / Methode", rawArguments: "Argumente als Lua", rawValues: "R\xFCckgaben als Lua", side: "Seite / Adresse", nickname: "Ger\xE4tespitzname", operator: "Operator", operation: "Operation", dimension: "Dimension", local: "Lokal deklarieren", returnCount: "Anzahl R\xFCckgaben" };
function Inspector({ project, cardId, graph, selected, definitions, edit, onOpenGroup, onDelete, onDuplicate }) {
  const chosen = graph.nodes.find((n) => n.id === selected[0]), group = project.groups.find((g) => g.id === cardId);
  const patchNode = (key, value) => edit(updateGraph(project, cardId, { ...graph, nodes: graph.nodes.map((n) => n.id === chosen.id ? { ...n, params: { ...n.params, [key]: value } } : n) }));
  if (chosen) {
    const def = definitions.get(chosen.id), callGroup = project.groups.find((g) => `function.card.${g.id}` === chosen.type);
    const dataInputs = def?.pins.filter((p) => p.direction === "INPUT" && p.kind === "DATA") || [];
    const fields = [.../* @__PURE__ */ new Set([...dataInputs.map((p) => p.id), ...Object.keys(def?.defaultParams || {}), ...Object.keys(chosen.params).filter((k) => ["code", "rawArguments", "rawValues", "callSymbol", "returnCount", "name", "local", "function", "operator", "operation", "dimension"].includes(k))])].filter((k) => !k.startsWith("source.") && k !== "functionId");
    return <><div className="panel-title"><span>KNOTEN</span><span className="count">{selected.length} gewählt</span></div><div className="inspector-content"><h3>{callGroup?.name || def?.title || chosen.type}</h3><p className="muted small">{def?.category || "Unbekannter Typ"}</p><Field label="Anzeigename"><input value={chosen.label || ""} placeholder={def?.title || "Knoten"} onChange={(e) => edit(updateGraph(project, cardId, { ...graph, nodes: graph.nodes.map((n) => n.id === chosen.id ? { ...n, label: e.target.value } : n) }))} /></Field>
      {callGroup && <Button icon="group" onClick={() => onOpenGroup(callGroup.id)}>Definition öffnen</Button>}
      {fields.map((key) => {
      const pin = dataInputs.find((p) => p.id === key), linked = graph.dataConnections.find((e) => e.to.nodeId === chosen.id && e.to.pinId === key);
      return <Field key={key} label={pin?.title || paramLabels[key] || key} hint={linked ? "Verkabelt \xB7 Festwert bleibt als Vorgabe erhalten" : pin?.dataType ? typeLabel[pin.dataType] || pin.dataType : void 0}><ParamInput name={key} value={chosen.params[key] ?? def?.defaultParams?.[key]} type={pin?.dataType} onChange={(value) => patchNode(key, value)} />{linked && <button className="text-button" onClick={() => edit(updateGraph(project, cardId, { ...graph, dataConnections: graph.dataConnections.filter((e) => e !== linked) }))}>Verbindung lösen</button>}</Field>;
    })}
      {chosen.type === "function.external" && <>{!fields.includes("callSymbol") && <Field label="Lua-Funktion / Methode"><input value={chosen.params.callSymbol || ""} placeholder="rednet.broadcast" onChange={(e) => patchNode("callSymbol", e.target.value)} /></Field>}{!fields.includes("rawArguments") && <Field label="Argumente als Lua"><textarea className="code-input" value={chosen.params.rawArguments || ""} onChange={(e) => patchNode("rawArguments", e.target.value)} /></Field>}{!fields.includes("returnCount") && <Field label="Anzahl Rückgaben"><input type="number" min="1" max="16" value={chosen.params.returnCount || 1} onChange={(e) => patchNode("returnCount", Number(e.target.value))} /></Field>}</>}
      {def?.documentation && <p className="documentation">{def.documentation}</p>}<div className="inspector-actions"><Button icon="copy" onClick={onDuplicate}>Duplizieren</Button><Button icon="trash" className="danger" onClick={onDelete} disabled={["function.input", "function.output"].includes(chosen.type)}>Entfernen</Button></div><p className="muted tiny mono">{chosen.id}</p></div></>;
  }
  const changeGroup = (patch) => edit({ ...project, groups: project.groups.map((g) => g.id === cardId ? { ...g, ...patch } : g) });
  const sockets = (key, title) => <section className="socket-editor"><div className="row between"><h4>{title}</h4><button className="icon-button" title={`${title} hinzuf\xFCgen`} onClick={() => changeGroup({ [key]: [...group[key], { id: `${key === "parameters" ? "arg" : "return"}.${uuid()}`, codeName: `${key === "parameters" ? "input" : "result"}_${group[key].length + 1}`, displayName: `${key === "parameters" ? "Eingang" : "Ergebnis"} ${group[key].length + 1}`, dataType: "ANY" }] })}><Icon name="plus" size={16} /></button></div>{group[key].map((s) => <div className="socket-fields" key={s.id}><input aria-label={`${title} Anzeigename`} value={s.displayName} onChange={(e) => changeGroup({ [key]: group[key].map((p) => p.id === s.id ? { ...p, displayName: e.target.value } : p) })} /><input className="mono" aria-label={`${title} Lua-Name`} value={s.codeName} onChange={(e) => changeGroup({ [key]: group[key].map((p) => p.id === s.id ? { ...p, codeName: e.target.value } : p) })} /><div className="row"><select aria-label={`${title} Datentyp`} value={s.dataType} onChange={(e) => changeGroup({ [key]: group[key].map((p) => p.id === s.id ? { ...p, dataType: e.target.value } : p) })}>{Object.entries(typeLabel).map(([type, label]) => <option value={type} key={type}>{label}</option>)}</select><button className="icon-button danger" title="Anschluss entfernen" onClick={() => changeGroup({ [key]: group[key].filter((p) => p.id !== s.id) })}><Icon name="close" size={15} /></button></div></div>)}</section>;
  return <><div className="panel-title"><span>{group ? "GRUPPENDEFINITION" : "PROJEKT"}</span><Icon name="settings" size={15} /></div><div className="inspector-content">{group ? <><h3>{group.name}</h3><Field label="Gruppenname"><input value={group.name} onChange={(e) => changeGroup({ name: e.target.value })} /></Field><Field label="Verhalten"><select value={group.stateful ? "stateful" : "function"} onChange={(e) => changeGroup({ stateful: e.target.value === "stateful" })}><option value="function">Funktion</option><option value="stateful">Eigener Zustand je Instanz</option></select></Field>{group.stateful && <p className="documentation">Jeder Aufrufknoten besitzt eine eigene Tabelle <code>state</code>. Sie bleibt zwischen Aufrufen erhalten und wird beim Programmstart neu angelegt.</p>}{sockets("parameters", "Eing\xE4nge")}{sockets("returns", "R\xFCckgaben")}<p className="documentation">Anschluss-IDs bleiben beim Umbenennen erhalten. Lua-Code im Inneren verwendet die Lua-Namen. Änderungen gelten für alle Instanzen in diesem Projekt.</p></> : <><h3>Ein Programm. Viele Bausteine.</h3><Field label="Projektname"><input value={project.name} maxLength={120} onChange={(e) => edit({ ...project, name: e.target.value })} /></Field><p className="documentation">Weiße Anschlüsse bestimmen den Ablauf. Farbige Anschlüsse übertragen Daten. Wiederverwendbare Funktionen und Zustandsgruppen findest du links im Projektbaum.</p><div className="legend">{["CONTROL", "STRING", "NUMBER", "BOOLEAN", "TABLE", "PERIPHERAL_HANDLE"].map((t) => <span key={t}><i style={{ background: colors[t] }} />{typeLabel[t] || "Ablauf"}</span>)}</div><p className="documentation">Lua wird vom nativen CCVisual-Kern erzeugt und von Cobalt auf Syntax geprüft. Es wird hier keine Maschine ausgeführt.</p><p className="muted small">Das Alpha-Projektformat ist eine eigene Browserdatei. Für CC:Tweaked exportierst du Lua oder den Installer.</p></>}</div></>;
}
function App() {
  const initial = useMemo(() => {
    try {
      return { workspace: readWorkspace() };
    } catch (error) {
      const project2 = newProject();
      return { workspace: { schema: 1, revision: 0, projects: [project2], activeId: project2.id, snapshots: [] }, error: error.message };
    }
  }, []);
  const [workspace, setWorkspace] = useState(initial.workspace), [tab, setTab] = useState("home"), [cardId, setCardId] = useState("main"), [selected, setSelected] = useState([]), [catalog, setCatalog] = useState(null), [pack, setPack] = useState(null), [manifest, setManifest] = useState(null), [startupError, setStartupError] = useState(""), [copycatOpened, setCopycatOpened] = useState(false), [message, setMessage] = useState(initial.error || ""), [dirty, setDirty] = useState(false), [conflict, setConflict] = useState(Boolean(initial.error)), [past, setPast] = useState([]), [future, setFuture] = useState([]), [modal, setModal] = useState(null), [search, setSearch] = useState(""), [packSearch, setPackSearch] = useState(""), [category, setCategory] = useState("Alle"), [compilation, setCompilation] = useState({ busy: true, result: null, error: "" }), [panel, setPanel] = useState("lua"), [flowNodes, setFlowNodes] = useState([]);
  const revision = useRef(workspace.revision), views = useRef({}), flow = useRef(null), canvas = useRef(null), fileInput = useRef(null), luaInput = useRef(null), stateRef = useRef(workspace), compileRef = useRef(0);
  stateRef.current = workspace;
  const project = workspace.projects.find((p) => p.id === workspace.activeId) || workspace.projects[0], graph = graphOf(project, cardId) || project.main;
  const notify = useCallback((text) => setMessage(text), []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["catalog.json", "pack.json", "studio.json"].map(async (path) => {
      const response = await fetch(`./${path}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Alpha-Datei fehlt: ${path}`);
      return response.json();
    })).then(([c, p, m]) => {
      setCatalog(c);
      setPack(p);
      setManifest(m);
    }).catch((e) => {
      if (e.name !== "AbortError") setStartupError(e.message);
    });
    return () => controller.abort();
  }, []);
  const save = useCallback(() => {
    try {
      const next = saveWorkspace(stateRef.current, revision.current);
      revision.current = next.revision;
      setWorkspace(next);
      setDirty(false);
      return true;
    } catch (e) {
      setConflict(true);
      notify(e.message);
      return false;
    }
  }, [notify]);
  useEffect(() => {
    if (!dirty || conflict) return;
    const timer = setTimeout(save, 900);
    return () => clearTimeout(timer);
  }, [workspace, dirty, conflict, save]);
  useEffect(() => {
    const listener = (e) => {
      if (e.key === STORAGE_KEY) {
        setConflict(true);
        notify("Ein anderer Tab hat die Bibliothek ge\xE4ndert. Dein Entwurf bleibt hier erhalten.");
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [notify]);
  useEffect(() => {
    const listener = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  const edit = useCallback((next) => {
    const current = stateRef.current.projects.find((p) => p.id === stateRef.current.activeId);
    if (!current) return;
    setPast((p) => [...p.slice(-49), clone(current)]);
    setFuture([]);
    setWorkspace((w) => ({ ...w, projects: w.projects.map((p) => p.id === current.id ? next : p) }));
    setDirty(true);
  }, []);
  const editGraph = (next) => edit(updateGraph(project, cardId, next));
  const openProject = (id, destination = "lua") => {
    setWorkspace((w) => ({ ...w, activeId: id }));
    setCardId("main");
    setSelected([]);
    setPast([]);
    setFuture([]);
    setTab(destination);
    setDirty(true);
  };
  const openCard = (id) => {
    setCardId(id);
    setSelected([]);
    setTimeout(() => {
      const view = views.current[`${project.id}:${id}`];
      if (view) flow.current?.setViewport(view, { duration: 150 });
      else flow.current?.fitView({ padding: 0.12, minZoom: 0.65, maxZoom: 1, duration: 150 });
    }, 70);
  };
  const addProject = (template) => {
    if (workspace.projects.length >= 32) return notify("Die Alpha-Bibliothek unterst\xFCtzt bis zu 32 Projekte.");
    const p = newProject(template);
    setWorkspace((w) => ({ ...w, projects: [...w.projects, p], activeId: p.id }));
    setPast([]);
    setFuture([]);
    setCardId("main");
    setSelected([]);
    setDirty(true);
    setTab("lua");
    setModal(null);
  };
  const undo = () => {
    if (!past.length) return;
    const previous = past.at(-1);
    setFuture((f) => [clone(project), ...f]);
    setPast((p) => p.slice(0, -1));
    setWorkspace((w) => ({ ...w, projects: w.projects.map((p) => p.id === project.id ? previous : p) }));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setPast((p) => [...p, clone(project)]);
    setFuture((f) => f.slice(1));
    setWorkspace((w) => ({ ...w, projects: w.projects.map((p) => p.id === project.id ? next : p) }));
    setDirty(true);
  };
  useEffect(() => {
    if (cardId !== "main" && !project.groups.some((g) => g.id === cardId)) setCardId("main");
  }, [project, cardId]);
  useEffect(() => {
    if (tab === "copycat") setCopycatOpened(true);
  }, [tab]);
  const projectText = JSON.stringify(project);
  useEffect(() => {
    const sequence = ++compileRef.current, controller = new AbortController();
    setCompilation((previous) => ({ ...previous, busy: true, error: "" }));
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("./api/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Pr\xFCfung fehlgeschlagen");
        if (sequence === compileRef.current) setCompilation({ busy: false, result, error: "" });
      } catch (error) {
        if (error.name !== "AbortError" && sequence === compileRef.current) setCompilation({ busy: false, result: null, error: error.message });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [projectText]);
  const definitions = useMemo(() => catalog ? definitionsFor(project, graph, catalog, compilation.result, cardId) : /* @__PURE__ */ new Map(), [project, graph, catalog, compilation.result, cardId]);
  const diagnostics = compilation.result?.diagnostics || [];
  useEffect(() => {
    setFlowNodes(graph.nodes.map((n) => ({ id: n.id, type: "studio", position: n.position, selected: selected.includes(n.id), data: { node: n, definition: definitions.get(n.id), group: project.groups.find((g) => `function.card.${g.id}` === n.type), error: diagnostics.find((d) => d.cardId === cardId && d.nodeId === n.id)?.message } })));
  }, [graph, definitions, cardId, compilation.result]);
  const flowEdges = useMemo(() => [...graph.execConnections.map((e, i) => ({ ...e, kind: "CONTROL", index: i })), ...graph.dataConnections.map((e, i) => ({ ...e, kind: "DATA", index: i }))].map((e) => ({ id: `${e.kind}:${e.index}`, source: e.from.nodeId, target: e.to.nodeId, sourceHandle: e.from.pinId, targetHandle: e.to.pinId, type: "smoothstep", animated: false, style: { stroke: color(definitions.get(e.from.nodeId)?.pins.find((p) => p.id === e.from.pinId) || { kind: e.kind }), strokeWidth: e.kind === "CONTROL" ? 2 : 1.6 }, data: { kind: e.kind, index: e.index } })), [graph, definitions]);
  const select = useCallback(({ nodes }) => setSelected((previous) => {
    const ids = nodes.map((n) => n.id);
    return ids.length === previous.length && ids.every((id, i) => previous[i] === id) ? previous : ids;
  }), []);
  const addNode = (def) => {
    const rect = canvas.current?.getBoundingClientRect(), point = flow.current && rect ? flow.current.screenToFlowPosition({ x: rect.x + rect.width * 0.45, y: rect.y + rect.height * 0.4 }) : { x: 200, y: 200 };
    const params = clone(def.defaultParams || {});
    if (def.id === "function.external") Object.assign(params, { callSymbol: "print", rawArguments: '"Hallo"', returnCount: 1 });
    if (def.id === "function.call") Object.assign(params, { function: "print", rawArguments: '"Hallo"' });
    if (def.id === "function.return") params.rawValues = "";
    if (def.id.startsWith("function.card.")) for (const pin of def.pins.filter((p) => p.kind === "DATA" && p.direction === "INPUT")) {
      if (["NUMBER", "INTEGER"].includes(pin.dataType)) params[pin.id] = 0;
      else if (pin.dataType === "STRING") params[pin.id] = "";
      else if (pin.dataType === "BOOLEAN") params[pin.id] = false;
    }
    const n = node(def.id, params, point.x, point.y);
    editGraph({ ...graph, nodes: [...graph.nodes, n] });
    setSelected([n.id]);
    setModal(null);
  };
  const removeSelected = () => {
    const ids = selected.filter((id) => !["function.input", "function.output"].includes(graph.nodes.find((n) => n.id === id)?.type));
    if (ids.length) {
      editGraph(removeNodes(graph, ids));
      setSelected([]);
    }
  };
  const duplicate = () => {
    const ids = selected.filter((id) => !["function.input", "function.output", "control.start"].includes(graph.nodes.find((n) => n.id === id)?.type));
    if (ids.length) editGraph(duplicateSelection(graph, ids));
  };
  useEffect(() => {
    const key = (e) => {
      const input = e.target.closest('input,textarea,select,[contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        return;
      }
      if (input || modal || tab !== "lua") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key === " ") {
        e.preventDefault();
        setModal("palette");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save, tab, modal, past, future, project, graph, selected]);
  const exported = compilation.result?.valid && !compilation.busy && !compilation.error;
  const exportLua = () => {
    if (!exported) return;
    download("main.lua", compilation.result.lua, "text/plain;charset=utf-8");
  };
  const exportProject = () => download(`${(project.name.trim() || "projekt").replace(/[^\p{L}\p{N}_-]/gu, "-")}.graphstudio.json`, JSON.stringify(project, null, 2));
  const loadFile = async (event, lua = false) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2e6) throw new Error("Datei ist zu gro\xDF.");
      const text = await file.text();
      let next;
      if (lua) {
        const response = await fetch("./api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: text }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        next = { ...newProject(), name: file.name.replace(/\.lua$/i, ""), main: data.graph };
        if (data.diagnostics?.length) notify("Lua-Entwurf importiert. Syntaxfehler im Codeknoten korrigieren.");
      } else next = validateProject(JSON.parse(text));
      if (workspace.projects.length >= 32) throw new Error("H\xF6chstens 32 Projekte.");
      next.id = uuid();
      setWorkspace((w) => ({ ...w, projects: [...w.projects, next], activeId: next.id }));
      setDirty(true);
      setTab("lua");
      setCardId("main");
      setPast([]);
      setFuture([]);
      setSelected([]);
    } catch (e) {
      notify(e.message);
    }
  };
  const reload = () => {
    try {
      const next = readWorkspace();
      setWorkspace(next);
      revision.current = next.revision;
      setDirty(false);
      setConflict(false);
      setPast([]);
      setFuture([]);
      setCardId("main");
      notify("Gespeicherten Stand geladen.");
    } catch (e) {
      notify(e.message);
    }
  };
  const addGroup = () => {
    const g = makeGroup(`Funktion ${project.groups.length + 1}`);
    edit({ ...project, groups: [...project.groups, g] });
    openCard(g.id);
  };
  const extract = () => {
    try {
      edit(extractGroup(project, cardId, selected, definitions, `Gruppe ${project.groups.length + 1}`));
      setSelected([]);
      notify("Auswahl als wiederverwendbare Gruppe angelegt.");
    } catch (e) {
      notify(e.message);
    }
  };
  const palette = useMemo(() => catalog ? [...project.groups.map(groupDefinition), ...catalog.definitions.filter((d) => d.id !== "snippet.call")] : [], [catalog, project.groups]);
  const categories = ["Alle", "Eigene Knotengruppen", ...new Set(palette.map((d) => d.category.split(" / ")[0]))].filter((s, i, a) => a.indexOf(s) === i);
  const visiblePalette = palette.filter((d) => (category === "Alle" || d.category === category || d.category.startsWith(category + " / ")) && `${d.title} ${d.category} ${d.id}`.toLowerCase().includes(search.toLowerCase()));
  const diagnosticClick = (d) => {
    openCard(d.cardId);
    if (d.nodeId) {
      setSelected([d.nodeId]);
      const n = graphOf(project, d.cardId)?.nodes.find((n2) => n2.id === d.nodeId);
      if (n) setTimeout(() => flow.current?.setCenter(n.position.x + 130, n.position.y + 70, { zoom: 0.9, duration: 220 }), 50);
    }
  };
  const status = compilation.error ? "Pr\xFCfung nicht verf\xFCgbar" : compilation.busy ? "Wird gepr\xFCft" : compilation.result?.valid ? "Lua gepr\xFCft" : `${diagnostics.length} Problem${diagnostics.length !== 1 ? "e" : ""}`;
  if (startupError) return <div className="startup"><h1>Alpha konnte nicht geladen werden</h1><p>{startupError}</p><p>Im Organisationsrepo <code>npm run alpha</code> und anschließend <code>npm run preview:alpha</code> starten.</p><Button onClick={() => location.reload()}>Erneut laden</Button></div>;
  return <div className="app">
    <header className="app-header"><a className="brand" href="#" onClick={(e) => {
    e.preventDefault();
    setTab("home");
  }}><span className="brand-icon"><Icon name="cube" size={25} /></span><span>Graphstudio<small>TEUTONSTUDIO</small></span><b>ALPHA</b></a><nav aria-label="Arbeitsbereiche">{[["home", "grid", "Arbeitsplatz"], ["lua", "code", "CC Lua"], ["copycat", "cube", "Copycat"], ["pack", "group", "Pack-APIs"]].map(([id, icon, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon name={icon} />{label}</button>)}</nav><div className="header-status"><span className={`save-status ${conflict ? "warn" : ""}`}>{conflict ? "Speicherkonflikt" : dirty ? "Wird gespeichert\u2026" : "Lokal gespeichert"}</span><button className="icon-button" title="Bibliothek speichern · Strg+S" onClick={save} disabled={conflict}><Icon name="save" /></button></div></header>
    {conflict && <div className="conflict-banner"><Icon name="warning" /><span>Die Bibliothek wurde in einem anderen Tab geändert oder konnte nicht gelesen werden. Sichere deinen Entwurf vor dem Laden.</span><button onClick={exportProject}>Entwurf exportieren</button><button onClick={reload}>Gespeicherten Stand laden</button></div>}
    {tab === "home" && <main className="home"><div className="home-intro"><div><p className="eyebrow">VON DER IDEE IN DIE SPIELWELT</p><h1>Deine Werkstatt für Graphen.</h1><p>Baue Formen, schreibe Programme und verwende deine Bausteine immer wieder.</p></div><Button className="primary" icon="plus" onClick={() => setModal("templates")}>Neues Lua-Projekt</Button></div><div className="workspace-cards"><button className="workspace-card lua-card" onClick={() => setTab("lua")}><span className="large-icon"><Icon name="code" size={30} /></span><span className="eyebrow">PROGRAMMIEREN</span><h2>CC Lua</h2><p>Typisierte Knoten, Funktionen und eigene Zustände. Als Lua für deine Computer exportieren.</p><span className="card-foot">{catalog ? `${catalog.definitions.length} Knotentypen` : "Katalog wird geladen"}<Icon name="chevron" /></span></button><button className="workspace-card copycat-card" onClick={() => setTab("copycat")}><span className="large-icon"><Icon name="cube" size={30} /></span><span className="eyebrow">KONSTRUIEREN</span><h2>Copycat Architect</h2><p>Formen und Gebäude im Organisationseditor. Mit eigenen Graphkarten und 3D-Vorschau.</p><span className="card-foot">Gemeinsamer Arbeitsplatz<Icon name="chevron" /></span></button></div><div className="section-head"><div><p className="eyebrow">DEINE BIBLIOTHEK</p><h2>Lua-Projekte</h2></div><div className="row"><Button icon="upload" onClick={() => fileInput.current.click()}>Projekt importieren</Button><Button icon="code" onClick={() => luaInput.current.click()}>Lua importieren</Button></div></div><div className="project-grid">{workspace.projects.map((p) => <button className="project-card" key={p.id} onClick={() => openProject(p.id)}><Icon name="folder" size={23} /><strong>{p.name || "Unbenanntes Projekt"}</strong><span>{p.main.nodes.length} Knoten · {p.groups.length} Gruppen</span></button>)}</div><div className="alpha-note"><Icon name="warning" /><div><strong>Ein Entwicklungsstand zum Ausprobieren</strong><p>CC-Lua verwendet lokal den echten CCVisual-Kern. Die ausgewählten API-Knoten und der Copycat-Adapter sind noch keine Freigabe für eine Minecraft-Mod-JAR. Der bisherige Copycat-Auftritt bleibt bestehen.</p></div><button className="text-button" onClick={() => setModal("about")}>Stand ansehen</button></div></main>}
    {tab === "lua" && <main className="lua-workspace"><aside className="project-sidebar"><div className="panel-title"><span>PROJEKT</span><button className="icon-button" title="Neues Projekt" onClick={() => setModal("templates")}><Icon name="plus" size={16} /></button></div><select className="project-select" aria-label="Aktives Projekt" value={project.id} onChange={(e) => openProject(e.target.value)}>{workspace.projects.map((p) => <option key={p.id} value={p.id}>{p.name || "Unbenanntes Projekt"}</option>)}</select><button className={`tree-item ${cardId === "main" ? "active" : ""}`} onClick={() => openCard("main")}><Icon name="code" /><span>main.lua<small>Programmeinstieg</small></span></button><div className="sidebar-section"><span>KNOTENGRUPPEN</span><button className="icon-button" title="Neue Knotengruppe" onClick={addGroup}><Icon name="plus" size={16} /></button></div>{project.groups.map((g) => <button key={g.id} className={`tree-item ${cardId === g.id ? "active" : ""}`} onClick={() => openCard(g.id)}><Icon name="group" /><span>{g.name}<small>{g.stateful ? "Eigener Zustand" : "Funktion"} · {project.main.nodes.concat(...project.groups.map((c) => c.graph.nodes)).filter((n) => n.type === `function.card.${g.id}`).length} Instanzen</small></span></button>)}{!project.groups.length && <p className="sidebar-hint">Erstelle eine Funktion oder fasse ausgewählte Knoten zu einer Gruppe zusammen.</p>}<div className="sidebar-section"><span>BAUSTEINE</span><button className="icon-button" title="Knoten suchen" onClick={() => setModal("palette")}><Icon name="search" size={16} /></button></div><label className="search-field"><Icon name="search" size={16} /><input aria-label="Knoten suchen" value={search} placeholder="Knoten suchen…" onChange={(e) => setSearch(e.target.value)} /></label><select className="category-select" aria-label="Knotenkategorie" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select><div className="inline-palette">{visiblePalette.slice(0, 45).map((d) => <button className="palette-item" key={d.id} title={d.documentation || d.id} onClick={() => addNode(d)}><span className="palette-symbol" style={{ color: d.category === "Eigene Knotengruppen" ? "#b995ef" : colors[d.pins.find((p) => p.kind === "DATA")?.dataType] || "#c0c9d6" }}>{d.category === "Eigene Knotengruppen" ? <Icon name="group" size={15} /> : symbols[d.pins.find((p) => p.kind === "DATA")?.dataType] || "\u25CB"}</span><span>{d.title}<small>{d.category}</small></span><Icon name="plus" size={13} /></button>)}{visiblePalette.length > 45 && <button className="text-button" onClick={() => setModal("palette")}>Alle {visiblePalette.length} Treffer anzeigen</button>}</div><div className="sidebar-footer"><Icon name="check" size={15} /><span>CCVisual · nativer Kern</span></div></aside>
      <section className="editor-center"><div className="editor-toolbar"><div className="breadcrumb"><button onClick={() => openCard("main")}>{project.name}</button><Icon name="chevron" size={13} /><strong>{cardId === "main" ? "main.lua" : project.groups.find((g) => g.id === cardId)?.name}</strong></div><div className="row toolbar-actions"><button className="icon-button" title="Rückgängig · Strg+Z" disabled={!past.length} onClick={undo}><Icon name="undo" /></button><button className="icon-button" title="Wiederholen · Strg+Umschalt+Z" disabled={!future.length} onClick={redo}><Icon name="redo" /></button><span className="separator" /><Button icon="plus" onClick={() => setModal("palette")}>Knoten</Button><Button icon="group" disabled={!selected.length} onClick={extract}>Gruppieren</Button><Button className="primary" icon="download" onClick={() => setModal("export")}>Export</Button></div></div><div className="canvas" ref={canvas}>{catalog ? <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} onInit={(instance) => {
    flow.current = instance;
    const view = views.current[`${project.id}:${cardId}`];
    if (view) instance.setViewport(view);
    else instance.fitView({ padding: 0.12, minZoom: 0.65, maxZoom: 1 });
  }} onMoveEnd={(_, viewport) => {
    views.current[`${project.id}:${cardId}`] = viewport;
  }} onNodesChange={(changes) => setFlowNodes((nodes) => applyNodeChanges(changes, nodes))} onNodeDragStop={(_, n, dragged) => {
    const moved = new Map((dragged?.length ? dragged : [n]).map((n2) => [n2.id, n2.position]));
    editGraph({ ...graph, nodes: graph.nodes.map((n2) => moved.has(n2.id) ? { ...n2, position: moved.get(n2.id) } : n2) });
  }} onConnect={(connection) => {
    try {
      editGraph(connect(graph, connection, definitions));
    } catch (e) {
      notify(e.message);
    }
  }} onSelectionChange={select} onPaneClick={() => setSelected([])} onNodeDoubleClick={(_, n) => {
    const g = project.groups.find((g2) => `function.card.${g2.id}` === n.data.node.type);
    if (g) openCard(g.id);
  }} onEdgeDoubleClick={(_, e) => {
    const [kind, index] = e.id.split(":");
    const key = kind === "DATA" ? "dataConnections" : "execConnections";
    editGraph({ ...graph, [key]: graph[key].filter((_2, i) => i !== Number(index)) });
  }} onEdgesDelete={(deleted) => {
    const remove = new Set(deleted.map((e) => e.id));
    editGraph({ ...graph, execConnections: graph.execConnections.filter((_, i) => !remove.has(`CONTROL:${i}`)), dataConnections: graph.dataConnections.filter((_, i) => !remove.has(`DATA:${i}`)) });
  }} deleteKeyCode={null} selectionKeyCode="Shift" multiSelectionKeyCode="Shift" fitView fitViewOptions={{ padding: 0.12, minZoom: 0.65, maxZoom: 1 }} minZoom={0.2} maxZoom={1.6} colorMode="dark" proOptions={{ hideAttribution: true }}><Background color="#303947" bgColor="#121820" gap={24} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(n) => n.data.group ? "#9275c3" : "#697c96"} maskColor="#0e131acc" pannable zoomable /><div className="canvas-instruction">Ziehen zum Verschieben · Kabel doppelt anklicken zum Trennen · Leertaste für Knoten</div></ReactFlow> : <div className="canvas-loading">Knotenkatalog wird geladen…</div>}</div><section className="output-panel"><div className="output-tabs"><button className={panel === "lua" ? "active" : ""} onClick={() => setPanel("lua")}><Icon name="code" size={15} />Lua-Vorschau</button><button className={panel === "diagnostics" ? "active" : ""} onClick={() => setPanel("diagnostics")}><Icon name="warning" size={15} />Diagnose{diagnostics.length > 0 && <b>{diagnostics.length}</b>}</button><button className={panel === "versions" ? "active" : ""} onClick={() => setPanel("versions")}><Icon name="clock" size={15} />Sicherungen</button><span className={`compile-status ${compilation.error || !compilation.busy && diagnostics.length ? "warn" : ""}`}><Icon name={compilation.busy ? "clock" : compilation.error || diagnostics.length ? "warning" : "check"} size={14} />{status}</span></div>{panel === "lua" ? <div className="code-panel"><pre>{compilation.error ? `Pr\xFCfung nicht verf\xFCgbar: ${compilation.error}

Die lokale Alpha mit npm run preview:alpha starten.` : compilation.result?.lua || (!compilation.busy ? "Die offenen Probleme vor dem Lua-Export beheben." : "Lua wird gepr\xFCft\u2026")}</pre>{exported && <button className="icon-button copy-code" title="Lua kopieren" onClick={() => navigator.clipboard.writeText(compilation.result.lua).then(() => notify("Lua in die Zwischenablage kopiert.")).catch(() => notify("Zwischenablage nicht verf\xFCgbar. Verwende den Lua-Download."))}><Icon name="copy" size={16} /></button>}</div> : panel === "diagnostics" ? <div className="diagnostics-panel">{compilation.error ? <p className="error-text">{compilation.error}</p> : diagnostics.length ? diagnostics.map((d, i) => <button key={i} onClick={() => diagnosticClick(d)}><Icon name="warning" size={16} /><span>{d.message}<small>{d.cardId === "main" ? "main.lua" : project.groups.find((g) => g.id === d.cardId)?.name || d.cardId}</small></span><Icon name="chevron" size={14} /></button>) : <div className="empty-state"><Icon name="check" /><span>{compilation.busy ? "Pr\xFCfung l\xE4uft\u2026" : "Graph und Lua-Syntax sind g\xFCltig. Die Ausf\xFChrung im Spiel ist ein eigener Pr\xFCfschritt."}</span></div>}</div> : <div className="versions-panel"><Button icon="save" onClick={() => {
    setWorkspace((w) => ({ ...w, snapshots: [{ id: uuid(), name: project.name, createdAt: (/* @__PURE__ */ new Date()).toISOString(), project: clone(project) }, ...w.snapshots].slice(0, 8) }));
    setDirty(true);
    notify("Projektstand in der lokalen Bibliothek gesichert.");
  }}>Aktuellen Stand sichern</Button>{workspace.snapshots.filter((s) => s.project.id === project.id).map((s) => <button className="snapshot" key={s.id} onClick={() => {
    edit(clone(s.project));
    notify("Sicherung wiederhergestellt. R\xFCckg\xE4ngig bleibt verf\xFCgbar.");
  }}><Icon name="clock" size={16} /><span>{s.name}<small>{new Date(s.createdAt).toLocaleString("de-DE")}</small></span><span>Wiederherstellen</span></button>)}</div>}</section><footer className="editor-status"><span>{graph.nodes.length} Knoten · {graph.execConnections.length + graph.dataConnections.length} Verbindungen</span><span>{project.groups.length} Gruppen · Änderungen lokal im Browser</span></footer></section>
      <aside className="inspector"><Inspector project={project} cardId={cardId} graph={graph} selected={selected} definitions={definitions} edit={edit} onOpenGroup={openCard} onDelete={removeSelected} onDuplicate={duplicate} /></aside></main>}
    <main className={`copycat-workspace ${tab === "copycat" ? "visible" : ""}`} aria-hidden={tab !== "copycat"}><div className="copycat-bar"><span><Icon name="cube" size={17} />Copycat Architect · Organisationsadapter</span><span>Eigenständige Copycat-Bibliothek in dieser Alpha</span><a href="https://teutonstudio.github.io/Copycat-Architecture/" target="_blank" rel="noreferrer">Bisherigen Editor öffnen<Icon name="external" size={14} /></a></div>{manifest && copycatOpened && <iframe title="Copycat Architect Grapheditor" src="./copycat/?editor=graph" tabIndex={tab === "copycat" ? 0 : -1} />}</main>
    {tab === "pack" && <main className="pack-page"><div className="section-head"><div><p className="eyebrow">VERTRÄGE UND ERWEITERUNGEN</p><h1>Das Modpack im Blick.</h1><p>Alle erkannten CC-Integrationen. Ein Inventareintrag bestätigt noch keine ausführbare API.</p></div><label className="search-field"><Icon name="search" /><input aria-label="Pack-API suchen" placeholder="Mod oder Integration suchen…" value={packSearch} onChange={(e) => setPackSearch(e.target.value)} /></label></div><div className="pack-summary"><div><strong>{pack?.providers.length || "\u2014"}</strong><span>relevante Container</span></div><div><strong>{pack ? `${pack.scannedArtifacts} / ${pack.lockedArtifacts}` : "\u2014"}</strong><span>Artefakte untersucht</span></div><div><strong>12</strong><span>ausgewählte API-Knoten</span></div><div><strong>{pack?.missingArtifacts.length || "\u2014"}</strong><span>lokale Prüflücken</span></div></div><div className="integration-note"><Icon name="group" /><p>Der native Grundkatalog ist bearbeitbar. Für weitere Modmethoden steht der universelle Lua-Aufruf bereit. Vollständige typisierte Packverträge folgen; Hostkontext und Gerätebindung müssen zum Programm passen.</p><Button onClick={() => {
    setTab("lua");
    setCategory("Lua");
    setSearch("");
  }}>Lua-Aufrufe öffnen</Button></div><div className="provider-list">{pack?.providers.filter((p) => JSON.stringify(p).toLowerCase().includes(packSearch.toLowerCase())).map((p) => <article className="provider" key={p.artifact}><span className="provider-icon"><Icon name="group" /></span><div><h3>{p.mods.map((m) => m.display_name).join(" / ")}</h3><p className="mono small">{p.file}</p>{p.artifact !== p.file && <p className="small muted">Eingebettete Integration: {p.artifact.split("!/").at(-1)}</p>}{p.notes.map((n) => <p className="small muted" key={n}>{n}</p>)}</div><div className="provider-meta"><span>{p.ccClasses} CC-Verweise · {p.luaResources} Lua-Dateien</span><b>Inventar geprüft</b></div></article>)}</div>{pack?.missingArtifacts.length > 0 && <details className="missing-artifacts"><summary>Offene Artefaktprüfung ({pack.missingArtifacts.length})</summary><ul>{pack.missingArtifacts.map((f) => <li key={f} className="mono">{f}</li>)}</ul></details>}</main>}
    <input hidden type="file" accept=".json,application/json" ref={fileInput} onChange={(e) => loadFile(e)} /><input hidden type="file" accept=".lua,text/plain" ref={luaInput} onChange={(e) => loadFile(e, true)} />
    {message && <div className="toast" role="status"><Icon name="warning" size={18} /><span>{message}</span><button className="icon-button" title="Meldung schließen" onClick={() => setMessage("")}><Icon name="close" size={15} /></button></div>}
    {modal === "templates" && <Modal title="Neues Lua-Projekt" onClose={() => setModal(null)}><p className="muted">Eine Vorlage anlegen und ihre Knoten direkt bearbeiten.</p>{[["hello", "Hallo Werkstatt", "Text ausgeben und Datenanschl\xFCsse kennenlernen."], ["counter", "Zwei unabh\xE4ngige Z\xE4hler", "Eine Zustandsgruppe, zwei Instanzen und getrennte Z\xE4hlerst\xE4nde."], ["redstone", "Redstone-Schalter", "Einen Eingang lesen und einen Ausgang regelm\xE4\xDFig schalten."]].map(([id, name, description]) => <button className="template" key={id} onClick={() => addProject(id)}><Icon name={id === "counter" ? "group" : "code"} /><span><strong>{name}</strong><small>{description}</small></span><Icon name="chevron" /></button>)}<div className="modal-footer"><Button icon="upload" onClick={() => {
    setModal(null);
    fileInput.current.click();
  }}>Projekt importieren</Button><Button icon="code" onClick={() => {
    setModal(null);
    luaInput.current.click();
  }}>Lua importieren</Button></div></Modal>}
    {modal === "palette" && <Modal title="Knoten hinzufügen" wide onClose={() => setModal(null)}><div className="palette-search"><label className="search-field"><Icon name="search" /><input autoFocus aria-label="Alle Knoten durchsuchen" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Aufgabe oder Lua-Name…" /></label><select aria-label="Alle Kategorien" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></div><div className="palette-results">{visiblePalette.map((d) => <button key={d.id} onClick={() => addNode(d)}><span className="palette-symbol">{d.category === "Eigene Knotengruppen" ? <Icon name="group" /> : <Icon name="plus" />}</span><span><strong>{d.title}</strong><small>{d.category} · {d.id}</small></span><Icon name="plus" size={16} /></button>)}{!visiblePalette.length && <p className="muted">Keine passenden Knoten. Suche verkürzen oder Kategorie wechseln.</p>}</div></Modal>}
    {modal === "export" && <Modal title="Projekt exportieren" onClose={() => setModal(null)}><p className="muted">{project.name}</p><button className="template" onClick={exportProject}><Icon name="group" /><span><strong>Bearbeitbares Alpha-Projekt</strong><small>Knoten, Gruppen, Anschlüsse und Layout als JSON.</small></span><Icon name="download" /></button><button className="template" disabled={!exported} onClick={exportLua}><Icon name="code" /><span><strong>main.lua für CC:Tweaked</strong><small>Alle Gruppen enthalten · nativ erzeugt und Syntax geprüft.</small></span><Icon name="download" /></button><button className="template" disabled={!exported} onClick={() => download("install.lua", installer(compilation.result.lua), "text/plain;charset=utf-8")}><Icon name="folder" /><span><strong>Offline-Installer</strong><small>Installiert main.lua in ein neues Verzeichnis.</small></span><Icon name="download" /></button>{!exported && <p className="error-text">{compilation.busy ? "Die native Pr\xFCfung l\xE4uft noch." : compilation.error || "Vor dem Lua-Export die Diagnose bearbeiten."}</p>}<p className="documentation">Benötigte Mods und Geräte bleiben Laufzeitvoraussetzungen. Der Export führt keine Hardwareaufrufe aus.</p></Modal>}
    {modal === "about" && <Modal title="Graphstudio Alpha · Entwicklungsstand" onClose={() => setModal(null)}><p>Version {manifest?.version}</p><dl><dt>Lua-Kern</dt><dd>Unveränderte CCVisual-Quellen, Kotlin/JVM und Cobalt.</dd><dt>Copycat</dt><dd>Organisationsadapter mit eigenem Buildoverlay.</dd><dt>Packumfang</dt><dd>39 inventarisierte Container; zunächst 12 ausgewählte Methoden als typisierte API-Knoten.</dd><dt>Prüfgrenze</dt><dd>Native Graphvalidierung und Lua-Syntax. Keine automatische Lua-Ausführung, kein Minecraft-Laufzeitnachweis.</dd></dl><p className="mono tiny">CCVisual {manifest?.ccvisual.sourceSha256}</p><p className="documentation">Für die lokale Prüfung und den Export muss die Alpha-Vorschau mit JVM-Bridge laufen. Eine reine statische Kopie bietet diese Funktionen noch nicht.</p></Modal>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);
