import { World } from 'oimo'
import { Quaternion, Vector3 } from 'three'

const SCALE = 4.5
const UNIT = 100

const PARTS = [
  { name: 'body', bone: 'body', local: [0, 0, 0], half: [4, 6, 2], density: 4 },
  { name: 'head', bone: 'head', local: [0, 4, 0], half: [4, 4, 4], density: 1.2 },
  { name: 'leftArm', bone: 'leftArm', local: [0, -4, 0], half: [2, 6, 2], density: 0.4 },
  { name: 'rightArm', bone: 'rightArm', local: [0, -4, 0], half: [2, 6, 2], density: 0.4 },
  { name: 'leftLeg', bone: 'leftLeg', local: [0, -6, 0], half: [2, 6, 2], density: 0.5 },
  { name: 'rightLeg', bone: 'rightLeg', local: [0, -6, 0], half: [2, 6, 2], density: 0.5 },
]

const JOINTS = [
  ['body', 'head'],
  ['body', 'leftArm'],
  ['body', 'rightArm'],
  ['body', 'leftLeg'],
  ['body', 'rightLeg'],
]

export function createDoll(bones, player, rig, vx, vy, taskbarWorldY) {
  const world = new World({
    timestep: 1 / 60,
    iterations: 4,
    broadphase: 2,
    worldscale: UNIT,
    gravity: [0, -9.8, 0],
    random: false,
    info: false,
  })
  const parts = PARTS.map((spec) => makePart(world, bones, spec))
  const byName = Object.fromEntries(parts.map((part) => [part.name, part]))
  for (const [parent, child] of JOINTS) {
    const a = byName[parent]
    const b = byName[child]
    const pivot = bonePoint(b.bone, 0, 0, 0)
    const pos1 = localPoint(a.body, pivot)
    const pos2 = localPoint(b.body, pivot)
    world.add({
      type: 'jointBall',
      body1: a.body,
      body2: b.body,
      pos1: [pos1.x, pos1.y, pos1.z],
      pos2: [pos2.x, pos2.y, pos2.z],
      collision: false,
    })
  }
  const ground = world.add({
    type: 'box',
    size: [16000, 40, 800],
    pos: [0, taskbarWorldY - 20, 0],
    move: false,
    density: 1,
    friction: 0.6,
    restitution: 0.05,
  })
  const torso = byName.body.body
  const torsoBody = torso
  torso.linearVelocity.set(vx / UNIT, vy / UNIT, 0)
  const spin = Math.min(1.4, Math.hypot(vx, vy) / 900)
  torso.angularVelocity.set((Math.random() - 0.5) * spin, (Math.random() - 0.5) * spin * 0.4, (Math.random() - 0.5) * spin)
  for (const part of parts) {
    part.bindQuat = part.bone.quaternion.clone()
    if (part.name === 'body') {
      continue
    }
    part.body.linearVelocity.set(vx / UNIT * 0.35, vy / UNIT * 0.35, 0)
    part.invBind = relativeQuat(torsoBody, part.body).invert()
  }
  return { world, parts, byName, ground, player, rig, pin: null, rest: 0 }
}

// Steve faces +Z, so the top of the back is local +Y and -Z on the torso box.
export function grabNeck(doll, screenX, screenY) {
  const body = doll.byName.body.body
  const neck = neckOffset(doll)
  if (!doll.pin) {
    const pin = doll.world.add({
      type: 'box',
      size: [6, 6, 6],
      pos: [screenX, -screenY, 0],
      move: false,
      collidesWith: 0,
    })
    doll.world.add({
      type: 'jointBall',
      body1: pin,
      body2: body,
      pos1: [0, 0, 0],
      pos2: neck,
      collision: false,
    })
    doll.pin = pin
    body.awake()
  }
  doll.pin.position.set(screenX / UNIT, -screenY / UNIT, 0)
  doll.pin.syncShapes()
}

export function releaseNeck(doll, screenVx, screenVy) {
  if (!doll.pin) {
    return
  }
  const body = doll.byName.body.body
  doll.world.removeRigidBody(doll.pin)
  doll.pin = null
  body.linearVelocity.set(screenVx / UNIT, -screenVy / UNIT, 0)
  body.awake()
}

function neckOffset(doll) {
  const half = doll.byName.body.half
  return [0, half[1], -half[2]]
}

const EDGE_BOUNCE = 0.82

function containDoll(doll, screenWidth, taskbarWorldY) {
  for (const part of doll.parts) {
    const body = part.body
    const hx = part.half[0]
    const hy = part.half[1]
    let x = body.position.x * UNIT
    let y = body.position.y * UNIT
    let z = body.position.z * UNIT
    let vx = body.linearVelocity.x
    let vy = body.linearVelocity.y
    let vz = body.linearVelocity.z
    let hit = false
    if (x < hx) {
      x = hx
      if (vx < 0) {
        vx = -vx * EDGE_BOUNCE
      }
      hit = true
    } else if (x > screenWidth - hx) {
      x = screenWidth - hx
      if (vx > 0) {
        vx = -vx * EDGE_BOUNCE
      }
      hit = true
    }
    if (y > -hy) {
      y = -hy
      if (vy > 0) {
        vy = -vy * EDGE_BOUNCE
      }
      hit = true
    } else if (y < taskbarWorldY) {
      y = taskbarWorldY + hy
      if (vy < 0) {
        vy = 0
      }
      hit = true
    }
    if (z > 48) {
      z = 48
      if (vz > 0) {
        vz = -vz * EDGE_BOUNCE
      }
      hit = true
    } else if (z < -48) {
      z = -48
      if (vz < 0) {
        vz = -vz * EDGE_BOUNCE
      }
      hit = true
    }
    if (!hit) {
      continue
    }
    body.position.set(x / UNIT, y / UNIT, z / UNIT)
    body.linearVelocity.set(vx, vy, vz)
    body.syncShapes()
  }
}

export function stepDoll(doll, delta, taskbarWorldY, screenWidth) {
  doll.world.numIterations = doll.pin ? 12 : 4
  const width = screenWidth > 0 ? screenWidth : 1280
  doll.ground.position.x = width / 2 / UNIT
  doll.ground.position.y = (taskbarWorldY - 20) / UNIT
  doll.ground.syncShapes()
  try {
    doll.world.step()
  } catch {
    return { speed: 0, y: taskbarWorldY }
  }
  // Screen X is world X. Screen top is world Y 0. Taskbar is taskbarWorldY.
  containDoll(doll, width, taskbarWorldY)
  syncDoll(doll)
  const torso = doll.byName.body.body
  const speed = torso.linearVelocity.length() * UNIT + torso.angularVelocity.length() * 20
  return { speed, y: torso.position.y * UNIT }
}

const worldQuat = new Quaternion()
const parentQuat = new Quaternion()
const childQuat = new Quaternion()

export function syncDoll(doll) {
  const torso = doll.byName.body.body
  torso.updateMesh()
  const torsoPos = torso.getPosition()
  const torsoOrientation = torso.getQuaternion()
  const torsoQuat = worldQuat.set(torsoOrientation.x, torsoOrientation.y, torsoOrientation.z, torsoOrientation.w)
  doll.player.quaternion.copy(torsoQuat)
  for (const part of doll.parts) {
    if (part.name === 'body') {
      part.bone.quaternion.identity()
      continue
    }
    part.body.updateMesh()
    const orientation = part.body.getQuaternion()
    childQuat.set(orientation.x, orientation.y, orientation.z, orientation.w)
    parentQuat.copy(torsoQuat).invert()
    part.bone.quaternion.copy(part.bindQuat).multiply(part.invBind).multiply(parentQuat.multiply(childQuat))
  }
  doll.player.updateWorldMatrix(true, true)
  const actual = bonePoint(doll.byName.body.bone, 0, 0, 0)
  doll.rig.position.x += torsoPos.x - actual.x
  doll.rig.position.y += torsoPos.y - actual.y
  doll.rig.position.z += torsoPos.z - actual.z
}

export function releaseDoll(doll) {
  doll.player.quaternion.identity()
  for (const part of doll.parts) {
    part.bone.quaternion.copy(part.bindQuat)
  }
}

function makePart(world, bones, spec) {
  const bone = bones[spec.bone]
  bone.updateWorldMatrix(true, true)
  const center = bonePoint(bone, ...spec.local)
  const quat = new Quaternion()
  bone.getWorldQuaternion(quat)
  const size = spec.half.map((value) => value * SCALE * 2)
  const body = world.add({
    type: 'box',
    size,
    pos: [center.x, center.y, center.z],
    move: true,
    density: spec.density,
    friction: 0.5,
    restitution: 0.08,
    neverSleep: false,
  })
  body.orientation.set(quat.x, quat.y, quat.z, quat.w)
  if (body.syncShapes) {
    body.syncShapes()
  }
  body.awake()
  return { name: spec.name, bone, body, half: spec.half.map((value) => value * SCALE) }
}

function relativeQuat(parentBody, childBody) {
  const parent = new Quaternion(parentBody.orientation.x, parentBody.orientation.y, parentBody.orientation.z, parentBody.orientation.w)
  const child = new Quaternion(childBody.orientation.x, childBody.orientation.y, childBody.orientation.z, childBody.orientation.w)
  return parent.invert().multiply(child)
}

function bonePoint(bone, x, y, z) {
  return bone.localToWorld(new Vector3(x, y, z))
}

function localPoint(body, point) {
  const offset = point.clone().sub(new Vector3(body.position.x * UNIT, body.position.y * UNIT, body.position.z * UNIT))
  const inverse = new Quaternion(body.orientation.x, body.orientation.y, body.orientation.z, body.orientation.w).invert()
  offset.applyQuaternion(inverse)
  return offset
}
