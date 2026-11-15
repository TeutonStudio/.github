const labels = {
  'source-verified': 'Austausch mit Modquellstand geprüft',
  'native-tested': 'Native Modelltests bestanden',
  'internal-prototype': 'Interner Browser-Prototyp',
  planned: 'Browseradapter geplant', failed: 'Prüfung fehlgeschlagen'
}
function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}
function link(label, url, parent) {
  const target = new URL(url, location.href)
  if (target.origin !== location.origin) throw new Error('Editor must use the same origin')
  const node = element('a', label, 'action'); node.href = target.href; parent.append(node)
}
try {
  const response = await fetch('./studio.json', { cache: 'no-store' })
  if (!response.ok) throw new Error('Prüfmanifest nicht erreichbar')
  const manifest = await response.json()
  if (manifest.schema !== 1 || !['public', 'internal'].includes(manifest.channel) || !Array.isArray(manifest.adapters)) throw new Error('Unbekanntes Prüfmanifest')
  const internal = manifest.channel === 'internal'
  document.getElementById('channel').textContent = internal ? 'INTERN · ENTWICKLUNG' : 'ÖFFENTLICH · GEPINNTER QUELLSTAND'
  document.getElementById('channel-info').textContent = internal
    ? 'Dieser lokale Teststand prüft deine Arbeitskopien. Nur über die lokale Adresse erreichbar. Ergebnisse sind keine öffentliche Modfreigabe.'
    : 'Der Copycat-Editor wird mit dem festgelegten öffentlichen Modquellstand geprüft. Eine bestimmte veröffentlichte Mod-JAR wurde dabei noch nicht abgenommen.'
  document.getElementById('built').textContent = `Geprüft: ${new Date(manifest.builtAt).toLocaleString('de-DE')}`
  for (const adapter of manifest.adapters) {
    const card = element('article', undefined, 'adapter')
    card.append(element('span', adapter.id === 'copycat' ? '01 / FORM & GEBÄUDE' : '02 / LUA & AUTOMATISIERUNG', 'eyebrow'), element('h3', adapter.name), element('p', labels[adapter.status] || 'Unbekannter Stand', `badge ${adapter.status === 'failed' ? 'failed' : ''}`))
    if (adapter.version) card.append(element('p', `Editor ${adapter.version}`))
    if (adapter.sourceCommit) card.append(element('p', `Modbasis ${adapter.sourceCommit.slice(0, 12)}${adapter.workingTree === 'modified' ? ' + lokale Änderungen' : ''}`, 'mono'))
    const checks = element('ul', undefined, 'checks')
    for (const [key, value] of Object.entries(adapter.checks || {})) {
      const names = { nativeCorpus: 'Native Testgraphen', browserTests: 'Browser-Modelltests', browserExportsInJvm: 'Browserexport im Modvalidator', nativeTests: 'Native Modelltests' }
      const detail = typeof value === 'object' ? `${value.tests - value.skipped} bestanden · ${value.skipped} übersprungen` : value === 'passed' ? 'bestanden' : value
      checks.append(element('li', `${names[key] || key}: ${detail}`))
    }
    card.append(checks)
    if (adapter.note) card.append(element('p', adapter.note, 'note'))
    if (adapter.url && adapter.status !== 'failed') {
      if (adapter.id === 'copycat') { link('Formgraph öffnen →', `${adapter.url}?editor=form`, card); link('Gebäudegraph öffnen →', `${adapter.url}?graph=building`, card) }
      else link('Editor öffnen →', adapter.url, card)
    } else card.append(element('p', adapter.status === 'failed' ? 'Details im lokalen Testlauf prüfen.' : 'Umsetzung im Plan beschrieben.', 'note'))
    document.getElementById('adapters').append(card)
  }
} catch (error) {
  document.getElementById('channel').textContent = 'PRÜFSTATUS NICHT VERFÜGBAR'
  document.getElementById('channel-info').textContent = `${error.message}. Graphstudio bitte neu bauen; ohne Prüfmanifest wird kein Editor freigegeben.`
}
