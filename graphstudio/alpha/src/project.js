export const FORMAT = "graphstudio.ccvisual.alpha";
export const STORAGE_KEY = "teutonstudio.graphstudio.alpha.workspace.v1";
export const uuid = () => crypto.randomUUID();
export const clone = (value) => structuredClone(value);
export const emptyGraph = () => ({ nodes: [], execConnections: [], dataConnections: [] });
export const node = (type, params = {}, x = 0, y = 0) => ({ id: uuid(), type, params, position: { x, y } });
export const edge = (from, fromPin, to, toPin) => ({ from: { nodeId: from.id, pinId: fromPin }, to: { nodeId: to.id, pinId: toPin } });
export function makeGroup(name = "Neue Funktion", stateful = false) {
  const id = uuid(), input = node("function.input", { functionId: id }, 0, 0), output = node("function.output", { functionId: id }, 420, 0);
  return { id, name, version: 1, stateful, parameters: [{ id: "arg.value", codeName: "value", displayName: "Wert", dataType: "NUMBER" }], returns: [{ id: "return.result", codeName: "result", displayName: "Ergebnis", dataType: "NUMBER" }], graph: { nodes: [input, output], execConnections: [edge(input, "next", output, "in")], dataConnections: [edge(input, "arg.value", output, "return.result")] } };
}
export function newProject(template = "hello") {
  const project = { format: FORMAT, schema: 1, id: uuid(), name: template === "counter" ? "Zwei unabh\xE4ngige Z\xE4hler" : template === "redstone" ? "Redstone-Schalter" : "Hallo Werkstatt", main: emptyGraph(), groups: [] };
  const start = node("control.start", {}, 0, 80);
  if (template === "counter") {
    const group = makeGroup("Z\xE4hler", true);
    group.parameters = [{ id: "arg.delta", codeName: "delta", displayName: "Schrittweite", dataType: "NUMBER" }];
    group.returns = [{ id: "return.count", codeName: "count", displayName: "Z\xE4hlerstand", dataType: "NUMBER" }];
    const [input, output] = group.graph.nodes, increment = node("raw.lua", { code: "state.count = (state.count or 0) + delta" }, 280, 80);
    output.position = { x: 620, y: 80 };
    output.params.rawValues = "state.count";
    group.graph = { nodes: [input, increment, output], execConnections: [edge(input, "next", increment, "in"), edge(increment, "next", output, "in")], dataConnections: [] };
    project.groups = [group];
    const repeat = node("control.repeat", { count: 3 }, 260, 80), a = node(`function.card.${group.id}`, { "arg.delta": 1 }, 520, 0), pa = node("terminal.print", {}, 800, 0), b = node(`function.card.${group.id}`, { "arg.delta": 10 }, 1060, 120), pb = node("terminal.print", {}, 1340, 120);
    project.main = { nodes: [start, repeat, a, pa, b, pb], execConnections: [edge(start, "next", repeat, "in"), edge(repeat, "body", a, "in"), edge(a, "next", pa, "in"), edge(pa, "next", b, "in"), edge(b, "next", pb, "in")], dataConnections: [edge(a, "return.count", pa, "value"), edge(b, "return.count", pb, "value")] };
  } else if (template === "redstone") {
    const loop = node("control.forever", {}, 260, 80), read = node("redstone.get_input", { side: "left" }, 270, 350), write = node("redstone.set_output", { side: "right", powered: false }, 560, 80), sleep = node("control.sleep", { seconds: 0.1 }, 860, 80);
    project.main = { nodes: [start, loop, read, write, sleep], execConnections: [edge(start, "next", loop, "in"), edge(loop, "body", write, "in"), edge(write, "next", sleep, "in")], dataConnections: [edge(read, "value", write, "powered")] };
  } else {
    const clear = node("terminal.clear", {}, 260, 80), text = node("literal.string", { value: "Hallo aus Graphstudio!" }, 270, 330), print = node("terminal.print", { value: "Hallo aus Graphstudio!" }, 560, 80);
    project.main = { nodes: [start, clear, text, print], execConnections: [edge(start, "next", clear, "in"), edge(clear, "next", print, "in")], dataConnections: [edge(text, "value", print, "value")] };
  }
  return project;
}
export function validateProject(input) {
  if (!input || input.format !== FORMAT || input.schema !== 1) throw new Error("Unbekanntes Projektformat. Ein Graphstudio-Alpha-Projekt ausw\xE4hlen.");
  if (typeof input.name !== "string" || input.name.length > 120) throw new Error("Projektname fehlt oder ist zu lang.");
  const validId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!validId(input.id) || !Array.isArray(input.groups) || input.groups.length > 64) throw new Error("Ung\xFCltige Projektstruktur.");
  if (new Set(input.groups.map((g) => g.id)).size !== input.groups.length) throw new Error("Doppelte Gruppen-ID.");
  let total = 0;
  for (const [key, g] of [["main", input.main], ...input.groups.map((g2) => [g2.id, g2.graph])]) {
    if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.execConnections) || !Array.isArray(g.dataConnections) || g.nodes.length > 2048 || g.execConnections.length > 8192 || g.dataConnections.length > 8192) throw new Error(`Ung\xFCltige oder zu gro\xDFe Karte: ${key}`);
    total += g.nodes.length;
    const ids = /* @__PURE__ */ new Set();
    for (const n of g.nodes) {
      if (!validId(n.id) || ids.has(n.id) || typeof n.type !== "string" || !n.type || !n.params || typeof n.params !== "object" || !Number.isFinite(n.position?.x) || !Number.isFinite(n.position?.y)) throw new Error("Ung\xFCltiger Knoten.");
      ids.add(n.id);
    }
    for (const e of [...g.execConnections, ...g.dataConnections]) if (!ids.has(e.from?.nodeId) || !ids.has(e.to?.nodeId) || typeof e.from?.pinId !== "string" || typeof e.to?.pinId !== "string") throw new Error("Verbindung verweist auf einen fehlenden Knoten.");
  }
  for (const g of input.groups) if (!validId(g.id) || !Array.isArray(g.parameters) || !Array.isArray(g.returns) || g.parameters.length > 32 || g.returns.length > 32) throw new Error("Ung\xFCltige Gruppenschnittstelle.");
  if (total > 8192 || JSON.stringify(input).length > 2e6) throw new Error("Projekt \xFCberschreitet die Alpha-Gr\xF6\xDFengrenze.");
  return clone(input);
}
export function graphOf(project, cardId) {
  return cardId === "main" ? project.main : project.groups.find((g) => g.id === cardId)?.graph;
}
export function updateGraph(project, cardId, graph) {
  return cardId === "main" ? { ...project, main: graph } : { ...project, groups: project.groups.map((g) => g.id === cardId ? { ...g, graph } : g) };
}
export function removeNodes(graph, ids) {
  const selected = new Set(ids);
  return { ...graph, nodes: graph.nodes.filter((n) => !selected.has(n.id)), execConnections: graph.execConnections.filter((e) => !selected.has(e.from.nodeId) && !selected.has(e.to.nodeId)), dataConnections: graph.dataConnections.filter((e) => !selected.has(e.from.nodeId) && !selected.has(e.to.nodeId)) };
}
export function duplicateSelection(graph, ids) {
  const selected = new Set(ids), mapping = new Map(ids.map((id) => [id, uuid()])), copy = graph.nodes.filter((n) => selected.has(n.id)).map((n) => ({ ...clone(n), id: mapping.get(n.id), position: { x: n.position.x + 60, y: n.position.y + 80 } }));
  const edges = (list) => list.filter((e) => selected.has(e.from.nodeId) && selected.has(e.to.nodeId)).map((e) => ({ from: { ...e.from, nodeId: mapping.get(e.from.nodeId) }, to: { ...e.to, nodeId: mapping.get(e.to.nodeId) } }));
  return { ...graph, nodes: [...graph.nodes, ...copy], execConnections: [...graph.execConnections, ...edges(graph.execConnections)], dataConnections: [...graph.dataConnections, ...edges(graph.dataConnections)] };
}
export function connect(graph, connection, definitions) {
  const fromDef = definitions.get(connection.source), toDef = definitions.get(connection.target);
  const from = fromDef?.pins.find((p) => p.id === connection.sourceHandle && p.direction === "OUTPUT"), to = toDef?.pins.find((p) => p.id === connection.targetHandle && p.direction === "INPUT");
  if (!from || !to || from.kind !== to.kind) throw new Error("Ablauf, Ereignisse und Daten getrennt verbinden.");
  if (connection.source === connection.target) throw new Error("F\xFCr Wiederholungen einen Schleifenknoten verwenden.");
  if (from.kind === "DATA" && from.dataType !== to.dataType && from.dataType !== "ANY" && to.dataType !== "ANY" && !(from.dataType === "INTEGER" && to.dataType === "NUMBER")) throw new Error(`Typen passen nicht: ${from.dataType} / ${to.dataType}`);
  const key = from.kind === "DATA" ? "dataConnections" : "execConnections";
  const replacement = { from: { nodeId: connection.source, pinId: connection.sourceHandle }, to: { nodeId: connection.target, pinId: connection.targetHandle } };
  return { ...graph, [key]: [...graph[key].filter((e) => !(e.to.nodeId === replacement.to.nodeId && e.to.pinId === replacement.to.pinId) && !(from.kind === "CONTROL" && e.from.nodeId === replacement.from.nodeId && e.from.pinId === replacement.from.pinId)), replacement] };
}
export function extractGroup(project, cardId, selection, definitions, name = "Neue Knotengruppe") {
  const graph = graphOf(project, cardId), ids = new Set(selection), selected = graph.nodes.filter((n) => ids.has(n.id));
  if (!selected.length || selected.some((n) => ["control.start", "function.input", "function.output"].includes(n.type))) throw new Error("Innere Knoten ausw\xE4hlen; Start und Kartengrenzen bleiben au\xDFerhalb.");
  if (selected.some((n) => n.type.startsWith("raw.") || n.type.startsWith("variable.") || ["function.call", "function.external", "function.return", "flow.condition", "flow.loop"].includes(n.type) || Object.keys(n.params).some((k) => k.startsWith("raw")))) throw new Error("Knoten mit Roh-Lua oder impliziten Variablen manuell als Funktion anlegen. Automatisches Gruppieren ben\xF6tigt explizite Datenanschl\xFCsse.");
  const incoming = graph.execConnections.filter((e) => !ids.has(e.from.nodeId) && ids.has(e.to.nodeId)), outgoing = graph.execConnections.filter((e) => ids.has(e.from.nodeId) && !ids.has(e.to.nodeId));
  if (incoming.length !== 1 || outgoing.length > 1) throw new Error("Die Auswahl ben\xF6tigt genau einen Ablaufeingang und h\xF6chstens einen Ausgang.");
  if (incoming.some((e) => definitions.get(e.to.nodeId)?.pins.find((p) => p.id === e.to.pinId)?.kind !== "CONTROL") || outgoing.some((e) => definitions.get(e.from.nodeId)?.pins.find((p) => p.id === e.from.pinId)?.kind !== "CONTROL")) throw new Error("Ereignisgrenzen in der Alpha manuell als Funktion anlegen.");
  const group = makeGroup(name), [input, output] = group.graph.nodes, call = node(`function.card.${group.id}`, {}, Math.min(...selected.map((n) => n.position.x)), Math.min(...selected.map((n) => n.position.y)));
  group.parameters = [];
  group.returns = [];
  const innerData = graph.dataConnections.filter((e) => ids.has(e.from.nodeId) && ids.has(e.to.nodeId)), outerData = graph.dataConnections.filter((e) => !ids.has(e.from.nodeId) && !ids.has(e.to.nodeId));
  const inputPins = /* @__PURE__ */ new Map(), outputPins = /* @__PURE__ */ new Map();
  for (const e of graph.dataConnections.filter((e2) => !ids.has(e2.from.nodeId) && ids.has(e2.to.nodeId))) {
    const key = `${e.from.nodeId}:${e.from.pinId}`;
    if (!inputPins.has(key)) {
      const socket = { id: `arg.${uuid()}`, codeName: `input_${inputPins.size + 1}`, displayName: `Eingang ${inputPins.size + 1}`, dataType: definitions.get(e.to.nodeId)?.pins.find((p) => p.id === e.to.pinId)?.dataType || "ANY" };
      inputPins.set(key, socket);
      group.parameters.push(socket);
      outerData.push({ from: e.from, to: { nodeId: call.id, pinId: socket.id } });
    }
    innerData.push({ from: { nodeId: input.id, pinId: inputPins.get(key).id }, to: e.to });
  }
  for (const e of graph.dataConnections.filter((e2) => ids.has(e2.from.nodeId) && !ids.has(e2.to.nodeId))) {
    const key = `${e.from.nodeId}:${e.from.pinId}`;
    if (!outputPins.has(key)) {
      const socket = { id: `return.${uuid()}`, codeName: `result_${outputPins.size + 1}`, displayName: `Ergebnis ${outputPins.size + 1}`, dataType: definitions.get(e.from.nodeId)?.pins.find((p) => p.id === e.from.pinId)?.dataType || "ANY" };
      outputPins.set(key, socket);
      group.returns.push(socket);
      innerData.push({ from: e.from, to: { nodeId: output.id, pinId: socket.id } });
    }
    outerData.push({ from: { nodeId: call.id, pinId: outputPins.get(key).id }, to: e.to });
  }
  const minX = Math.min(...selected.map((n) => n.position.x)), minY = Math.min(...selected.map((n) => n.position.y));
  input.position = { x: 0, y: 80 };
  output.position = { x: Math.max(...selected.map((n) => n.position.x)) - minX + 640, y: 80 };
  group.graph = { nodes: [input, ...selected.map((n) => ({ ...clone(n), position: { x: n.position.x - minX + 320, y: n.position.y - minY + 80 } })), output], execConnections: [edge(input, "next", { id: incoming[0].to.nodeId }, incoming[0].to.pinId), ...graph.execConnections.filter((e) => ids.has(e.from.nodeId) && ids.has(e.to.nodeId)), ...outgoing.length ? [{ from: outgoing[0].from, to: { nodeId: output.id, pinId: "in" } }] : []], dataConnections: innerData };
  const next = { ...graph, nodes: [...graph.nodes.filter((n) => !ids.has(n.id)), call], execConnections: [...graph.execConnections.filter((e) => !ids.has(e.from.nodeId) && !ids.has(e.to.nodeId)), { from: incoming[0].from, to: { nodeId: call.id, pinId: "in" } }, ...outgoing.length ? [{ from: { nodeId: call.id, pinId: "next" }, to: outgoing[0].to }] : []], dataConnections: outerData };
  return { ...updateGraph(project, cardId, next), groups: [...updateGraph(project, cardId, next).groups, group] };
}
export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
export function installer(lua) {
  const quote = (value) => {
    let eq = "";
    while (value.includes(`]${eq}]`)) eq += "=";
    return `[${eq}[${value}]${eq}]`;
  };
  return `-- Graphstudio Alpha: neues Verzeichnis anlegen, vorhandene Daten behalten
local target = (...) or "graphstudio-program"
assert(not fs.exists(target), "Ziel existiert bereits: " .. target)
fs.makeDir(target)
local file = assert(fs.open(fs.combine(target, "main.lua"), "w"))
file.write(${quote(lua)}); file.close()
print("Installiert: " .. target .. "/main.lua")
print("Start: " .. target .. "/main.lua")
`;
}
