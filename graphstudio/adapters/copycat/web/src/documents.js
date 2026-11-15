export const identityOf = entry => entry.documentId || entry.id
export function migrateEntry(entry) { return { ...entry, documentId:identityOf(entry), version:entry.version || 1 } }
export function appendVersion(entries, entry, identity) {
  if(entries.length >= 500) throw new Error('Höchstens 500 gespeicherte Versionen. Zuerst nicht benötigte Versionen löschen.')
  const existing = entries.map(migrateEntry)
  const documentId = identity || crypto.randomUUID()
  const version = 1 + Math.max(0,...existing.filter(item => identityOf(item) === documentId).map(item => item.version))
  const next = { ...structuredClone(entry), id:crypto.randomUUID(), documentId, version, savedAt:new Date().toISOString() }
  return [...existing, next]
}
export function dependencies(workspace, entry) {
  const keys = new Set([`${identityOf(entry)}@${entry.version || 1}`, `browser_${identityOf(entry).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,36)}@${entry.version || 1}`])
  const matches = []
  for (const owner of [...workspace.graphs,...workspace.nodeGroups,...Object.values(workspace.drafts)]) {
    if (owner.id === entry.id) continue
    const label = owner.name || owner.document?.name || 'Aktueller Entwurf'
    for (const ref of owner.references || []) if (keys.has(ref)) matches.push(label)
    for(const group of owner.document?.graph?.nodeGroups || []) if(group.libraryReference?.documentId===identityOf(entry) && group.libraryReference.version===(entry.version || 1)) matches.push(`${label} · ${group.name}`)
    // A source copied into the owner's library is independent and survives deletion.
    for (const node of owner.document?.graph?.nodes || owner.nodes || []) {
      if (node.libraryReference?.documentId === identityOf(entry) && node.libraryReference.version === (entry.version || 1)) matches.push(`${label} · ${node.id}`)
      if (keys.has(node.form) && !owner.library?.forms?.[node.form]) matches.push(`${label} · ${node.id}`)
    }
  }
  return [...new Set(matches)]
}
export function deleteVersion(workspace, collection, id) {
  const entry = workspace[collection].find(e => e.id === id)
  if (!entry) throw new Error('Dieser Speicherstand existiert nicht mehr.')
  const refs = dependencies(workspace,entry)
  if (refs.length) throw new Error(`Version wird noch verwendet: ${refs.join(', ')}`)
  return {...workspace,[collection]:workspace[collection].filter(e => e.id !== id)}
}
export function validateReferences(document, library = {}) {
  for (const node of document.graph.nodes) {
    if (node.kind === 'COPYCAT' && !node.block && node.form && !library.forms?.[node.form]) throw new Error(`Fehlende Formreferenz: ${node.form}`)
    if (node.module && !library.modules?.[node.module]) throw new Error(`Fehlende Segmentreferenz: ${node.module}`)
  }
  return document
}

const canonical = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value
export function mergeVersions(current, incoming) {
  const result=current.map(migrateEntry)
  const payload = entry => {const {savedAt,...value}=migrateEntry(entry);return JSON.stringify(canonical(value))}
  for (const value of incoming) {
    const entry=migrateEntry(value)
    const previous=result.find(item => item.id === entry.id || identityOf(item) === identityOf(entry) && item.version === entry.version)
    if(previous && payload(previous) !== payload(entry)) throw new Error(`Unveränderliche Version kollidiert mit der Sicherung: ${entry.name} · v${entry.version}`)
    if(!previous) result.push(entry)
  }
  if(result.length > 500) throw new Error('Die zusammengeführte Bibliothek überschreitet 500 Speicherstände.')
  return result
}
