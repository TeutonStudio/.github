// One cancellable preview request. A worker must finish loading before it can
// accept a job; a stopped local server must not leave the UI pending forever.
export function createPreviewRunner(createWorker, onResult, { startupTimeout = 10000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let worker = null, request = null, ready = false, timer = null
  const stop = () => {
    if (timer !== null) clearTimer(timer)
    timer = null
    const previous = worker
    worker = null; ready = false
    if (previous) { previous.onmessage = previous.onerror = previous.onmessageerror = null; previous.terminate() }
  }
  const fail = message => {
    const job = request
    request = null; stop()
    if (job) onResult({ id: job.id, viewKey: job.viewKey, error: message, diagnostics: [] })
  }
  const post = () => { try { worker.postMessage(request) } catch (error) { fail(error.message || 'Die Vorschauanfrage konnte nicht übertragen werden.') } }
  const start = () => {
    let instance
    try { instance = createWorker(); worker = instance } catch (error) { fail(error.message || 'Der Vorschauprozess konnte nicht gestartet werden.'); return }
    instance.onmessage = ({ data }) => {
      if (worker !== instance) return
      if (data.ready) {
        ready = true; clearTimer(timer); timer = null
        if (request) post()
      } else if (request && data.id === request.id) {
        request = null; onResult(data)
      }
    }
    instance.onerror = event => { if (worker === instance) fail(event.message || 'Der Vorschauprozess konnte nicht geladen werden. Prüfe, ob der lokale Server läuft.') }
    instance.onmessageerror = () => { if (worker === instance) fail('Das Vorschauergebnis konnte nicht gelesen werden.') }
    timer = setTimer(() => { if (worker === instance) fail('Der Vorschauprozess konnte nicht geladen werden. Prüfe, ob der lokale Server läuft, und lade die Vorschau erneut.') }, startupTimeout)
  }
  return {
    submit(job) {
      if (request) stop()
      request = job
      if (!worker) start()
      else if (ready) post()
    },
    cancel() { if (request) stop(); request = null },
    dispose() { request = null; stop() },
  }
}
