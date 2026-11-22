import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { referenceFrame, updateReferenceFrame } from '../src/preview-reference-frame.js'

const target = new THREE.Vector3(0.5, 0.5, 0.5)
const cameras = {
  perspective: () => new THREE.PerspectiveCamera(42, 1.8, 0.01, 100000),
  orthographic: () => new THREE.OrthographicCamera(-1.8, 1.8, 1, -1, 0.01, 100000),
}
const projectedLength = (mark, camera, height) => {
  const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(mark.mesh.quaternion)
  const a = mark.mesh.position.clone().addScaledVector(direction, -mark.mesh.scale.y / 2).project(camera)
  const b = mark.mesh.position.clone().addScaledVector(direction, mark.mesh.scale.y / 2).project(camera)
  return Math.hypot((a.x - b.x) * camera.aspect, a.y - b.y) * height / 2
}

for (const [name, createCamera] of Object.entries(cameras)) {
  test(`reference ticks keep their projected minimum and maximum at extreme ${name} zoom and off axis`, () => {
    const group = new THREE.Group()
    referenceFrame(group)
    const camera = createCamera()
    if (camera.isOrthographicCamera) camera.aspect = 1.8
    let smallest = Infinity, largest = 0
    for (const height of [160, 800, 2160]) for (const distance of [0.1, 1, 5, 10000]) {
      for (const direction of [[1, 0.7, 1.1], [0, 0, 1], [0.001, 1, 0]]) {
        camera.position.copy(target).addScaledVector(new THREE.Vector3(...direction).normalize(), distance)
        camera.lookAt(target)
        for (const zoom of [0.01, 1, 100]) {
          camera.zoom = zoom
          camera.updateProjectionMatrix()
          updateReferenceFrame(group, camera, height)
          for (const edge of group.userData.reference.edges) for (const mark of edge.marks) {
            if (!mark.mesh.visible) continue
            const pixels = projectedLength(mark, camera, height)
            const min = mark.major ? 6 : 3, max = mark.major ? 16 : 8
            assert.ok(Number.isFinite(pixels) && pixels >= min - 1e-5 && pixels <= max + 1e-5, `${pixels} px, ${min}..${max}`)
            if (mark.major) { smallest = Math.min(smallest, pixels); largest = Math.max(largest, pixels) }
          }
        }
      }
    }
    assert.ok(Math.abs(smallest - 6) < 1e-5)
    assert.ok(Math.abs(largest - 16) < 1e-5)
  })
}

test('tick centers stay at 4, 8 and 12 hB while their lengths respond to zoom', () => {
  const group = new THREE.Group()
  const bounds = referenceFrame(group)
  assert.deepEqual(bounds.min.toArray(), [0, 0, 0])
  assert.deepEqual(bounds.max.toArray(), [1, 1, 1])
  const camera = cameras.perspective()
  camera.position.set(4, 3, 5); camera.lookAt(target)
  const edges = group.userData.reference.edges
  const positions = edges.flatMap(edge => edge.marks.map(mark => mark.mesh.position.toArray()))
  for (const edge of edges) {
    const axis = edge.direction.toArray().findIndex(value => value === 1)
    assert.deepEqual(edge.marks.map(mark => mark.mesh.position.getComponent(axis) * 16), [4, 8, 12])
    assert.deepEqual(edge.marks.map(mark => mark.major), [false, true, false])
  }
  updateReferenceFrame(group, camera, 800)
  const before = edges[0].marks[1].mesh.scale.y
  camera.zoom = 100; camera.updateProjectionMatrix()
  updateReferenceFrame(group, camera, 800)
  assert.ok(edges[0].marks[1].mesh.scale.y < before)
  assert.deepEqual(edges.flatMap(edge => edge.marks.map(mark => mark.mesh.position.toArray())), positions)
})

test('ticks behind the near plane disappear instead of covering the preview', () => {
  const group = new THREE.Group()
  referenceFrame(group)
  const camera = cameras.perspective()
  camera.position.set(0.5, 0.5, 0.75); camera.lookAt(target)
  updateReferenceFrame(group, camera, 800)
  const marks = group.userData.reference.edges.flatMap(edge => edge.marks)
  assert.ok(marks.some(mark => !mark.mesh.visible))
  assert.ok(marks.some(mark => mark.mesh.visible))
  for (const mark of marks) if (mark.mesh.visible) assert.ok(Number.isFinite(mark.mesh.scale.y) && mark.mesh.scale.y > 0)
})
