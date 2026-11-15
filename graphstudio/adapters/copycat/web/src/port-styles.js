import { editorContract } from './generated/engine.mjs'
export const portStyles = editorContract().portStyles
export function semanticType(raw = '') {
  if (raw === 'shape' || raw === 'COPYCAT' || raw.startsWith('COPYCAT_')) return 'shape'
  if (['rotation', 'mirroring', 'position'].includes(raw.toLowerCase())) return raw.toLowerCase()
  if (raw === 'INT') return 'INT'
  if (raw.startsWith('SEGMENT') || ['WALL', 'PATTERN', 'FLOOR', 'CEILING', 'ROTATION_SEGMENT'].includes(raw)) return 'segment'
  if (['ROOM', 'BAY_WINDOW', 'ROOM_LAYOUT', 'ROOM_GEOMETRY'].includes(raw)) return 'room'
  if (raw === 'STOREY') return 'storey'
  if (raw.startsWith('ROOF') || raw === 'DORMER') return 'roof'
  if (raw === 'AREA') return 'AREA'
  if (raw.toLowerCase() === 'material') return 'material'
  return 'structure'
}
export const portStyle = raw => portStyles[semanticType(raw)]
