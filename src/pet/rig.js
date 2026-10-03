import { Bone } from 'three'

const PARTS = ['body', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']

export function bindPlayer(player) {
  const skin = player.skin
  const bones = {}
  for (const name of PARTS) {
    bones[name] = insertBone(skin[name], name)
  }
  const hips = new Bone()
  hips.name = 'hips'
  skin.add(hips)
  hips.position.set(0, -12, 0)
  const spine = new Bone()
  spine.name = 'spine'
  skin.add(spine)
  spine.position.copy(bones.body.position)
  hips.attach(spine)
  spine.attach(bones.body)
  spine.attach(bones.head)
  spine.attach(bones.leftArm)
  spine.attach(bones.rightArm)
  hips.attach(bones.leftLeg)
  hips.attach(bones.rightLeg)
  bones.hips = hips
  bones.spine = spine
  return bones
}

function insertBone(part, name) {
  const bone = new Bone()
  bone.name = name
  part.parent.add(bone)
  bone.position.copy(part.position)
  bone.quaternion.copy(part.quaternion)
  bone.scale.copy(part.scale)
  bone.add(part)
  part.position.set(0, 0, 0)
  part.quaternion.identity()
  part.scale.set(1, 1, 1)
  return bone
}
