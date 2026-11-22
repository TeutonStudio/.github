import * as THREE from 'three'
import { axisColors } from './orientation.js'

export function referenceFrame(group) {
  const bounds = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(1, 1, 1))
  const size = bounds.getSize(new THREE.Vector3()).max(new THREE.Vector3(1, 1, 1))
  bounds.max.copy(bounds.min).add(size)
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 8)
  const material = (color, opacity) => new THREE.MeshBasicMaterial({ color, opacity, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })
  const surfaces = ['x', 'y', 'z'].map(axis => ({
    front: material(axisColors[axis], 0.95), back: material(axisColors[axis], 0.42)
  }))
  const markFront = material('#ff8b2d', 0.98)
  const markBack = material('#ff8b2d', 0.38)
  const cylinder = (position, direction, length, surface) => {
    const mesh = new THREE.Mesh(geometry, surface)
    mesh.position.copy(position)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    mesh.scale.set(0.004, length, 0.004)
    mesh.renderOrder = 3
    group.add(mesh)
    return mesh
  }
  const edges = []
  for (let axis = 0; axis < 3; axis++) {
    const { front, back } = surfaces[axis]
    const others = [0, 1, 2].filter(value => value !== axis)
    const direction = new THREE.Vector3().setComponent(axis, 1)
    for (const first of [0, 1]) for (const second of [0, 1]) {
      const start = bounds.min.clone()
      start.setComponent(others[0], first ? bounds.max.getComponent(others[0]) : bounds.min.getComponent(others[0]))
      start.setComponent(others[1], second ? bounds.max.getComponent(others[1]) : bounds.min.getComponent(others[1]))
      const center = start.clone().addScaledVector(direction, size.getComponent(axis) / 2)
      const mesh = cylinder(center, direction, size.getComponent(axis), front)
      const marks = [0.25, 0.5, 0.75].map(fraction => {
        const position = start.clone().addScaledVector(direction, size.getComponent(axis) * fraction)
        return { mesh: cylinder(position, new THREE.Vector3(0, 1, 0), 0.05, markFront), major: fraction === 0.5 }
      })
      edges.push({ mesh, marks, direction, front, back, faces: [{ axis: others[0], sign: first ? 1 : -1 }, { axis: others[1], sign: second ? 1 : -1 }] })
    }
  }
  group.userData.reference = { edges, markFront, markBack }
  return bounds
}


export function updateReferenceFrame(group, camera, height) {
  const reference = group.userData.reference
  if (!reference) return
  camera.updateMatrixWorld()
  const viewDirection = camera.getWorldDirection(new THREE.Vector3())
  const cameraPosition = camera.getWorldPosition(new THREE.Vector3())
  const up = new THREE.Vector3(0, 1, 0)
  // View depth, not radial distance, determines perspective magnification.
  const depthAt = point => point.clone().applyMatrix4(camera.matrixWorldInverse).z * -1
  const unitsPerPixel = depth => camera.isOrthographicCamera
    ? (camera.top - camera.bottom) / camera.zoom / Math.max(height, 1)
    : 2 * depth * Math.tan(camera.fov * Math.PI / 360) / camera.zoom / Math.max(height, 1)
  for (const edge of reference.edges) {
    const depth = depthAt(edge.mesh.position)
    edge.mesh.visible = depth > camera.near
    const visible = edge.faces.some(face => face.sign * (cameraPosition.getComponent(face.axis) - edge.mesh.position.getComponent(face.axis)) > 0)
    edge.mesh.material = visible ? edge.front : edge.back
    edge.mesh.renderOrder = visible ? 3 : 2
    const radius = unitsPerPixel(Math.max(camera.near, depth)) * (visible ? 0.9 : 0.55)
    edge.mesh.scale.x = radius
    edge.mesh.scale.z = radius
    for (const mark of edge.marks) {
      const markDepth = depthAt(mark.mesh.position)
      mark.mesh.visible = markDepth > camera.near
      if (!mark.mesh.visible) continue
      // Keep both endpoints in the camera plane so the pixel bounds also hold off axis.
      const direction = edge.direction.clone().cross(viewDirection)
      if (direction.lengthSq() < 0.00001) direction.set(1, 0, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()))
      direction.normalize()
      const scale = unitsPerPixel(markDepth)
      const length = THREE.MathUtils.clamp((mark.major ? 0.1 : 0.05) / scale, mark.major ? 6 : 3, mark.major ? 16 : 8)
      const width = THREE.MathUtils.clamp(0.004 / scale, mark.major ? 0.55 : 0.4, mark.major ? 1.1 : 0.65)
      mark.mesh.scale.set(scale * width, scale * length, scale * width)
      mark.mesh.quaternion.setFromUnitVectors(up, direction)
      mark.mesh.material = visible ? reference.markFront : reference.markBack
      mark.mesh.renderOrder = visible ? 5 : 4
    }
  }
}
