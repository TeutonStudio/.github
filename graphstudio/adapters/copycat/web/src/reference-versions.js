import {identityOf} from './documents.js'
import {libraryReferenceEntries} from './reference-groups.js'
export function referenceVersions(node,document,library,workspace) {
 const reference=node.libraryReference
 if(!reference || !node.referenceKey)return []
 const embedded=libraryReferenceEntries({graphs:document.graph.graphDefinitions || {}})
 const candidates=[...(workspace.graphs || []).map(e=>({...e,collection:'graphs'})),...(workspace.nodeGroups || []).map(e=>({...e,collection:'nodeGroups'})),...libraryReferenceEntries(library),...embedded]
 const versions=new Map()
 for(const entry of candidates)if(identityOf(entry)===reference.documentId && !versions.has(entry.version || 1))versions.set(entry.version || 1,entry)
 return [...versions.values()].sort((a,b)=>(b.version || 1)-(a.version || 1))
}
