const CLIPS = {
  PET_IDLE: {
    loop: 4,
    tracks: {
      'hips.position.y': [[0, -12], [0.45, -11.35], [0.9, -12], [2.2, -11.55], [3.1, -12], [4, -12]],
      'spine.rotation.x': [[0, 0.02], [2, 0.07], [4, 0.02]],
      'spine.rotation.z': [[0, 0.03], [2, -0.03], [4, 0.03]],
      'head.rotation.y': [[0, 0], [1.1, 0.28], [2, 0], [3.1, -0.26], [4, 0]],
      'head.rotation.z': [[0, 0.04], [1.1, 0.12], [2, 0], [3.1, -0.1], [4, 0.04]],
      'leftArm.rotation.z': [[0, 0.12], [2, 0.2], [4, 0.12]],
      'rightArm.rotation.z': [[0, -0.12], [2, -0.2], [4, -0.12]],
      'leftArm.rotation.x': [[0, 0.04], [2, 0.1], [4, 0.04]],
      'rightArm.rotation.x': [[0, 0.04], [2, 0.1], [4, 0.04]],
    },
  },
  PET_WALK_RIGHT: {
    loop: 0.72,
    tracks: {
      'hips.position.y': [[0, -12], [0.08, -11.2], [0.18, -10.2], [0.36, -12], [0.44, -11.2], [0.54, -10.2], [0.72, -12]],
      'hips.rotation.z': [[0, 0.04], [0.18, 0.1], [0.36, 0], [0.54, -0.1], [0.72, 0.04]],
      'spine.rotation.x': [[0, 0.08], [0.18, 0.02], [0.36, 0.1], [0.54, 0.02], [0.72, 0.08]],
      'spine.rotation.y': [[0, 0.08], [0.36, -0.08], [0.72, 0.08]],
      'head.rotation.x': [[0, 0.04], [0.18, -0.06], [0.36, 0.04], [0.54, -0.06], [0.72, 0.04]],
      'head.rotation.y': [[0, -0.06], [0.36, 0.06], [0.72, -0.06]],
      'leftLeg.rotation.x': [[0, 0.15], [0.12, 0.85], [0.28, 0.15], [0.48, -0.55], [0.72, 0.15]],
      'rightLeg.rotation.x': [[0, -0.15], [0.12, -0.55], [0.36, 0.1], [0.5, 0.85], [0.72, -0.15]],
      'leftArm.rotation.x': [[0, -0.1], [0.18, -0.75], [0.36, -0.05], [0.54, 0.55], [0.72, -0.1]],
      'rightArm.rotation.x': [[0, 0.1], [0.18, 0.55], [0.36, 0.05], [0.54, -0.75], [0.72, 0.1]],
      'leftArm.rotation.z': [[0, 0.16], [0.36, 0.28], [0.72, 0.16]],
      'rightArm.rotation.z': [[0, -0.16], [0.36, -0.28], [0.72, -0.16]],
    },
  },
  PET_DRAGGING: {
    loop: 1.1,
    tracks: {
      'spine.rotation.x': [[0, 0.22], [0.55, 0.32], [1.1, 0.22]],
      'head.rotation.x': [[0, -0.28], [0.55, -0.16], [1.1, -0.28]],
      'head.rotation.z': [[0, 0.08], [0.55, -0.08], [1.1, 0.08]],
      'leftArm.rotation.x': [[0, -0.35], [0.55, -0.15], [1.1, -0.35]],
      'rightArm.rotation.x': [[0, -0.2], [0.55, -0.45], [1.1, -0.2]],
      'leftArm.rotation.z': [[0, 0.45], [1.1, 0.45]],
      'rightArm.rotation.z': [[0, -0.45], [1.1, -0.45]],
      'leftLeg.rotation.x': [[0, 0.05], [0.35, 0.38], [0.7, 0.05], [1.1, 0.05]],
      'rightLeg.rotation.x': [[0, 0.2], [0.55, -0.05], [1.1, 0.2]],
    },
    swing: true,
  },
  HoverReaction: {
    tracks: {
      'hips.position.y': [[0, -12], [0.18, -11.1], [0.45, -12], [1.2, -12]],
      'spine.rotation.x': [[0, 0], [0.25, -0.08], [1.2, -0.04]],
      'head.rotation.x': [[0, 0], [0.28, -0.32], [0.8, -0.22], [1.2, -0.16]],
      'head.rotation.z': [[0, 0], [0.4, 0.16], [1.2, 0.1]],
      'leftArm.rotation.z': [[0, 0.1], [0.35, 0.42], [1.2, 0.28]],
      'rightArm.rotation.z': [[0, -0.1], [0.35, -0.42], [1.2, -0.28]],
      'leftArm.rotation.x': [[0, 0], [0.35, -0.25], [1.2, -0.12]],
      'rightArm.rotation.x': [[0, 0], [0.35, -0.25], [1.2, -0.12]],
    },
  },
  FACE_HAIR_STROKE: {
    tracks: {
      'head.rotation.z': [[0, 0], [0.35, 0.22], [1.15, 0.28], [1.8, 0.06]],
      'head.rotation.x': [[0, 0], [0.4, -0.12], [1.15, -0.05], [1.8, 0]],
      'spine.rotation.z': [[0, 0], [0.4, 0.06], [1.8, 0]],
      'rightArm.rotation.x': [[0, 0], [0.4, -1.25], [1.15, -1.15], [1.8, -0.15]],
      'rightArm.rotation.z': [[0, 0], [0.4, -0.55], [1.15, -0.4], [1.8, -0.08]],
      'leftArm.rotation.z': [[0, 0.1], [1.8, 0.12]],
    },
  },
  PET_HAPPY: {
    tracks: {
      'hips.position.y': [[0, -12], [0.16, -9.2], [0.34, -12], [0.52, -9.6], [0.74, -12], [2.2, -12]],
      'spine.rotation.x': [[0, 0], [0.2, -0.12], [0.7, -0.06], [2.2, 0]],
      'head.rotation.x': [[0, 0], [0.2, -0.2], [0.7, -0.08], [2.2, 0]],
      'leftArm.rotation.x': [[0, 0], [0.22, -1.35], [1.3, -1.45], [2.2, -0.1]],
      'rightArm.rotation.x': [[0, 0], [0.22, -1.35], [1.3, -1.45], [2.2, -0.1]],
      'leftArm.rotation.z': [[0, 0.1], [0.22, 0.55], [1.3, 0.48], [2.2, 0.12]],
      'rightArm.rotation.z': [[0, -0.1], [0.22, -0.55], [1.3, -0.48], [2.2, -0.12]],
    },
  },
  PET_SITTING: {
    loop: 2.6,
    tracks: {
      'spine.rotation.x': [[0, 0.12], [1.3, 0.18], [2.6, 0.12]],
      'spine.rotation.z': [[0, 0.04], [1.3, -0.04], [2.6, 0.04]],
      'head.rotation.y': [[0, 0.12], [1.3, -0.16], [2.6, 0.12]],
      'head.rotation.z': [[0, 0.06], [1.3, -0.05], [2.6, 0.06]],
      'leftLeg.rotation.x': [[0, -1.02], [0.45, -0.72], [0.9, -1.08], [2.6, -1.02]],
      'rightLeg.rotation.x': [[0, -1.08], [1.3, -0.7], [1.8, -1.1], [2.6, -1.08]],
      'leftArm.rotation.x': [[0, -0.22], [1.3, -0.32], [2.6, -0.22]],
      'rightArm.rotation.x': [[0, -0.22], [1.3, -0.28], [2.6, -0.22]],
      'leftArm.rotation.z': [[0, 0.16], [2.6, 0.16]],
      'rightArm.rotation.z': [[0, -0.16], [2.6, -0.16]],
    },
  },
  PET_SLEEPING: {
    loop: 3.6,
    tracks: {
      'spine.rotation.x': [[0, 0.22], [1.8, 0.3], [3.6, 0.22]],
      'head.rotation.x': [[0, 0.48], [1.8, 0.56], [3.1, 0.42], [3.35, 0.5], [3.6, 0.48]],
      'head.rotation.z': [[0, 0.12], [3.6, 0.12]],
      'leftArm.rotation.x': [[0, 0.2], [3.6, 0.2]],
      'rightArm.rotation.x': [[0, 0.25], [3.6, 0.25]],
      'leftArm.rotation.z': [[0, 0.08], [3.6, 0.08]],
      'rightArm.rotation.z': [[0, -0.05], [3.6, -0.05]],
      'hips.position.y': [[0, -12.3], [1.8, -12.55], [3.6, -12.3]],
    },
  },
  PET_DANCING: {
    loop: 1.28,
    tracks: {
      'hips.position.y': [[0, -12], [0.16, -10.4], [0.32, -12], [0.64, -12], [0.8, -10.4], [0.96, -12], [1.28, -12]],
      'hips.rotation.y': [[0, 0.22], [0.32, 0.22], [0.64, -0.22], [0.96, -0.22], [1.28, 0.22]],
      'spine.rotation.x': [[0, -0.06], [1.28, -0.06]],
      'head.rotation.y': [[0, -0.12], [0.64, 0.14], [1.28, -0.12]],
      'leftArm.rotation.x': [[0, -0.9], [0.32, -1.35], [0.64, -0.7], [1.28, -0.9]],
      'rightArm.rotation.x': [[0, -0.7], [0.64, -0.9], [0.96, -1.35], [1.28, -0.7]],
      'leftArm.rotation.z': [[0, 0.35], [1.28, 0.35]],
      'rightArm.rotation.z': [[0, -0.35], [1.28, -0.35]],
      'leftLeg.rotation.x': [[0, 0], [0.2, 0.28], [0.4, 0], [1.28, 0]],
      'rightLeg.rotation.x': [[0, 0], [0.72, 0], [0.92, 0.28], [1.12, 0], [1.28, 0]],
    },
  },
  PET_HIDING: {
    tracks: {
      'spine.rotation.x': [[0, 0], [0.45, 0.72], [2.1, 0.72], [2.45, 0.35], [2.7, 0.7], [3, 0.7]],
      'head.rotation.x': [[0, 0], [0.45, 0.35], [2.1, 0.35], [2.45, -0.15], [2.7, 0.4], [3, 0.4]],
      'hips.position.y': [[0, -12], [0.45, -13.2], [2.1, -13.2], [2.45, -12.4], [3, -13.1]],
      'leftLeg.rotation.x': [[0, 0], [0.45, 0.55], [3, 0.55]],
      'rightLeg.rotation.x': [[0, 0], [0.45, 0.55], [3, 0.55]],
      'leftArm.rotation.x': [[0, 0], [0.45, 0.35], [3, 0.35]],
      'rightArm.rotation.x': [[0, 0], [0.45, 0.35], [3, 0.35]],
    },
  },
  PET_FLING: {
    tracks: {
      'spine.rotation.x': [[0, 0.2], [0.2, -0.4], [0.42, 0.3]],
      'head.rotation.x': [[0, 0.2], [0.2, -0.3], [0.42, 0.4]],
      'leftArm.rotation.z': [[0, 0.4], [0.15, 1.4], [0.3, 0.2], [0.42, 1.2]],
      'rightArm.rotation.z': [[0, -1.2], [0.18, -0.2], [0.36, -1.5], [0.42, -0.4]],
      'leftLeg.rotation.x': [[0, 0.4], [0.2, -0.6], [0.42, 0.5]],
      'rightLeg.rotation.x': [[0, -0.5], [0.22, 0.6], [0.42, -0.3]],
    },
  },
  PET_STICK: {
    tracks: {
      'spine.rotation.x': [[0, 0.15], [0.4, 0.05], [1.1, 0.08]],
      'head.rotation.z': [[0, 0.35], [0.35, -0.2], [0.7, 0.25], [1.1, 0.1]],
      'head.rotation.x': [[0, 0.2], [1.1, 0.05]],
      'leftArm.rotation.z': [[0, 1.15], [0.2, 0.85], [1.1, 0.95]],
      'rightArm.rotation.z': [[0, -1.15], [0.25, -0.8], [1.1, -0.95]],
      'leftArm.rotation.x': [[0, -0.2], [1.1, 0.1]],
      'rightArm.rotation.x': [[0, -0.2], [1.1, 0.1]],
      'leftLeg.rotation.x': [[0, 0.15], [1.1, 0.05]],
      'rightLeg.rotation.x': [[0, -0.1], [1.1, 0]],
    },
  },
  PET_SLIDE: {
    loop: 0.8,
    tracks: {
      'spine.rotation.x': [[0, 0.12], [0.4, 0.22], [0.8, 0.12]],
      'head.rotation.x': [[0, 0.35], [0.8, 0.35]],
      'leftArm.rotation.z': [[0, 0.9], [0.4, 1.15], [0.8, 0.9]],
      'rightArm.rotation.z': [[0, -0.9], [0.4, -1.15], [0.8, -0.9]],
      'leftArm.rotation.x': [[0, 0.45], [0.8, 0.45]],
      'rightArm.rotation.x': [[0, 0.45], [0.8, 0.45]],
      'leftLeg.rotation.x': [[0, 0.2], [0.4, 0.45], [0.8, 0.2]],
      'rightLeg.rotation.x': [[0, 0.1], [0.4, 0.35], [0.8, 0.1]],
      'hips.position.y': [[0, -12], [0.4, -12.6], [0.8, -12]],
    },
  },
  PET_LOOK_DOWN: {
    tracks: {
      'spine.rotation.x': [[0, 0.12], [0.35, 0.42], [1.15, 0.55]],
      'head.rotation.x': [[0, 0.1], [0.4, 0.55], [0.8, 0.85], [1.15, 0.95]],
      'head.rotation.y': [[0, 0], [0.7, 0.08], [1.15, 0]],
      'leftArm.rotation.x': [[0, -0.2], [0.3, 0.35], [1.15, 0.55]],
      'rightArm.rotation.x': [[0, -0.2], [0.3, 0.35], [1.15, 0.55]],
      'leftArm.rotation.z': [[0, 0.15], [0.4, 0.45], [1.15, 0.5]],
      'rightArm.rotation.z': [[0, -0.15], [0.4, -0.45], [1.15, -0.5]],
      'leftLeg.rotation.x': [[0, -1.05], [1.15, -1.05]],
      'rightLeg.rotation.x': [[0, -1.05], [1.15, -0.85]],
      'hips.position.y': [[0, -12], [0.5, -12.4], [1.15, -12.2]],
    },
  },
  PET_LEAP: {
    tracks: {
      'hips.position.y': [[0, -12.4], [0.12, -13.1], [0.28, -9.2], [0.48, -11]],
      'spine.rotation.x': [[0, 0.55], [0.12, 0.7], [0.28, -0.25], [0.48, 0.05]],
      'head.rotation.x': [[0, 0.9], [0.16, 0.4], [0.32, -0.15], [0.48, -0.05]],
      'leftLeg.rotation.x': [[0, -0.9], [0.14, -1.3], [0.3, -0.2], [0.48, 0.15]],
      'rightLeg.rotation.x': [[0, -0.8], [0.14, -1.2], [0.3, -0.15], [0.48, 0.1]],
      'leftArm.rotation.x': [[0, 0.4], [0.16, -0.4], [0.36, -1.6], [0.48, -2.2]],
      'rightArm.rotation.x': [[0, 0.45], [0.14, -0.2], [0.3, -2.1], [0.48, -2.55]],
      'rightArm.rotation.z': [[0, -0.4], [0.48, -0.2]],
      'leftArm.rotation.z': [[0, 0.4], [0.48, 0.25]],
    },
  },
  PET_FALL: {
    loop: 1.4,
    tracks: {
      'spine.rotation.x': [[0, 0.08], [0.7, 0.16], [1.4, 0.08]],
      'head.rotation.x': [[0, -0.12], [0.7, -0.22], [1.4, -0.12]],
      'rightArm.rotation.x': [[0, -2.55], [1.4, -2.55]],
      'rightArm.rotation.z': [[0, -0.2], [1.4, -0.2]],
      'leftArm.rotation.z': [[0, 0.2], [0.7, 0.4], [1.4, 0.2]],
      'leftArm.rotation.x': [[0, -0.15], [0.7, -0.35], [1.4, -0.15]],
      'leftLeg.rotation.x': [[0, 0.12], [0.7, 0.32], [1.4, 0.12]],
      'rightLeg.rotation.x': [[0, -0.08], [0.7, -0.28], [1.4, -0.08]],
    },
  },
  PET_BIG_SCREEN: {
    loop: 1.6,
    tracks: {
      'hips.position.y': [[0, -12], [0.4, -11.2], [0.8, -12], [1.2, -11.2], [1.6, -12]],
      'spine.rotation.x': [[0, -0.08], [1.6, -0.08]],
      'head.rotation.z': [[0, 0.06], [0.8, -0.06], [1.6, 0.06]],
      'leftArm.rotation.z': [[0, 0.7], [0.4, 0.95], [0.8, 0.7], [1.6, 0.7]],
      'rightArm.rotation.z': [[0, -0.7], [0.8, -0.7], [1.2, -0.95], [1.6, -0.7]],
      'leftArm.rotation.x': [[0, -0.35], [1.6, -0.35]],
      'rightArm.rotation.x': [[0, -0.35], [1.6, -0.35]],
    },
  },
}

export function playClip(bones, name, time, swing = { x: 0, z: 0 }) {
  resetBones(bones)
  const clip = CLIPS[name] ?? CLIPS.PET_IDLE
  for (const [path, keys] of Object.entries(clip.tracks)) {
    const [bone, prop, axis] = path.split('.')
    bones[bone][prop][axis] = sample(keys, time, clip.loop)
  }
  if (clip.swing) {
    bones.spine.rotation.x += swing.x
    bones.spine.rotation.z += swing.z * 0.85
    bones.hips.rotation.z += swing.z * 0.25
  }
}

function sample(keys, time, loop) {
  const end = keys[keys.length - 1][0]
  let cursor = time
  if (loop && end > 0) {
    cursor = time % end
  }
  if (cursor <= keys[0][0]) {
    return keys[0][1]
  }
  for (let index = 1; index < keys.length; index += 1) {
    if (cursor > keys[index][0]) {
      continue
    }
    const span = keys[index][0] - keys[index - 1][0]
    const amount = span === 0 ? 1 : (cursor - keys[index - 1][0]) / span
    const eased = amount * amount * (3 - 2 * amount)
    return keys[index - 1][1] + (keys[index][1] - keys[index - 1][1]) * eased
  }
  return keys[keys.length - 1][1]
}

function resetBones(bones) {
  for (const bone of Object.values(bones)) {
    bone.rotation.set(0, 0, 0)
  }
  bones.hips.position.y = -12
}
