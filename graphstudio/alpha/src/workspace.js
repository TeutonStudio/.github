import { clone, newProject, STORAGE_KEY, validateProject } from "./project.js";
export function readWorkspace(storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const project = newProject();
    return { schema: 1, revision: 0, projects: [project], activeId: project.id, snapshots: [] };
  }
  const data = JSON.parse(raw);
  if (data.schema !== 1 || !Number.isInteger(data.revision) || !Array.isArray(data.projects) || !data.projects.length || data.projects.length > 32) throw new Error("Die gespeicherte Alpha-Bibliothek hat ein unbekanntes Format.");
  data.projects = data.projects.map(validateProject);
  if (new Set(data.projects.map((p) => p.id)).size !== data.projects.length) throw new Error("Doppelte Projekt-ID im Speicher.");
  data.activeId = data.projects.some((p) => p.id === data.activeId) ? data.activeId : data.projects[0].id;
  data.snapshots = Array.isArray(data.snapshots) ? data.snapshots.slice(0, 8).map((s) => ({ ...s, project: validateProject(s.project) })) : [];
  return data;
}
export function saveWorkspace(workspace, expectedRevision, storage = localStorage) {
  const raw = storage.getItem(STORAGE_KEY), current = raw ? JSON.parse(raw) : null;
  if ((current?.revision || 0) !== expectedRevision) throw new Error("Ein anderer Tab hat die Bibliothek ge\xE4ndert. Zuerst den anderen Stand laden oder deinen Entwurf exportieren.");
  const next = { ...clone(workspace), schema: 1, revision: expectedRevision + 1, savedAt: (/* @__PURE__ */ new Date()).toISOString() };
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
