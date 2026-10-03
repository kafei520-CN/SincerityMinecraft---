import * as THREE from 'three';
import {PlayerObject} from 'skinview3d';
import {bindPlayer} from './rig.js';
import {playClip} from './clips.js';
import {MateActionController} from './mate-engine.js';
import {choosePetAction} from './tree.js';
import {createDoll, grabNeck, releaseDoll, releaseNeck, stepDoll, syncDoll} from './ragdoll.js';

const SCALE = 4.5;
const FEET = 16.25;
const HEAD = 12;

const status = document.querySelector('#status');
const view = document.querySelector('#view');
const renderer = new THREE.WebGLRenderer({alpha: true, antialias: false});
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio);
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 800);
camera.position.z = 400;
scene.add(new THREE.AmbientLight(0xffffff, 3));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(40, 80, 120);
scene.add(sun);

const rig = new THREE.Group();
const player = new PlayerObject();
player.cape.visible = false;
player.elytra.visible = false;
player.ears.visible = false;
player.scale.set(SCALE, SCALE, SCALE);
rig.add(player);
scene.add(rig);

const skinTexture = new THREE.TextureLoader().load('/pet/vanilla/steve.png');
skinTexture.magFilter = THREE.NearestFilter;
skinTexture.minFilter = THREE.NearestFilter;
skinTexture.generateMipmaps = false;
skinTexture.colorSpace = THREE.SRGBColorSpace;
player.skin.map = skinTexture;
player.skin.modelType = 'default';
const bones = bindPlayer(player);
const actions = new MateActionController();

const pet = {x: 180, y: 0, mode: 'idle'};
const swing = {x: 0, y: 0, z: 0};
const look = {yaw: 0, pitch: 0};
const faceYaw = {current: 0};
const pointer = {x: 180, y: 200};
const headPoint = new THREE.Vector3();
let holding = false;
let pressing = false;
let hovering = false;
let lastTap = 0;
let pressX = 0;
let pressY = 0;
let lastPointer = {x: 0, y: 0};
let lastFrame = performance.now();
let calm = 0;
let idleWait = 8;
let wander = null;
let falling = false;
let fallYaw = 0;
let phase = null;
let phaseTime = 0;
let doll = null;
let dragSample = null;
let dragVel = {x: 0, y: 0};
let poseTime = 0;
let poseName = '';
let frameChoice = 'idle';

function floorY() {
  return window.innerHeight - 48;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.left = 0;
  camera.right = width;
  camera.top = 0;
  camera.bottom = -height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (!holding && pet.mode !== 'ragdoll') {
    pet.y = floorY();
  }
}

function beginWander() {
  const margin = 72;
  const left = margin;
  const right = Math.max(left + 1, window.innerWidth - margin);
  const dir = Math.random() < 0.5 ? -1 : 1;
  let target = pet.x + dir * (180 + Math.random() * 320);
  if (target < left || target > right) {
    target = dir > 0 ? right : left;
  }
  if (Math.abs(target - pet.x) < 80) {
    target = pet.x < window.innerWidth / 2 ? right : left;
  }
  wander = {targetX: target, face: target >= pet.x ? 1 : -1};
  calm = 0;
}

function stepWander(delta) {
  if (!wander || holding) {
    return;
  }
  const dx = wander.targetX - pet.x;
  if (Math.abs(dx) <= 3) {
    pet.x = wander.targetX;
    wander = null;
    calm = 0;
    idleWait = 6 + Math.random() * 10;
    return;
  }
  wander.face = dx > 0 ? 1 : -1;
  pet.x += Math.sign(dx) * Math.min(Math.abs(dx), 86 * delta);
  pet.y = floorY();
  pet.mode = 'idle';
}

function beginDragDoll(x, y) {
  pointer.x = x;
  pointer.y = y;
  player.updateWorldMatrix(true, true);
  if (!doll) {
    doll = createDoll(bones, player, rig, 0, 0, -floorY());
  }
  phase = 'ragdoll';
  phaseTime = 0;
  pet.mode = 'ragdoll';
  falling = false;
  wander = null;
  dragSample = {x, y};
  dragVel = {x: 0, y: 0};
  grabNeck(doll, x, y);
}

function dragVelocity(delta) {
  if (!dragSample) {
    dragSample = {x: pointer.x, y: pointer.y};
    return dragVel;
  }
  const dt = Math.max(delta, 0.016);
  dragVel = {
    x: (pointer.x - dragSample.x) / dt,
    y: (pointer.y - dragSample.y) / dt,
  };
  dragSample = {x: pointer.x, y: pointer.y};
  return dragVel;
}

function think(delta) {
  actions.elapsed += delta;
  if (phase) {
    phaseTime += delta;
  }
  if (!holding && !falling && !phase && !wander) {
    calm += delta;
  } else if (holding || falling || phase) {
    calm = 0;
  }
  const choice = choosePetAction({
    holding,
    falling,
    phase,
    wander: Boolean(wander),
    calm,
    idleWait,
  });
  if (choice !== 'walk' && choice !== 'wander') {
    wander = null;
  }
  if (choice === 'wander') {
    beginWander();
  }
  const resolved = phase === 'ragdoll' || phase === 'glance'
    ? phase
    : falling
      ? 'fall'
      : choice;
  if (resolved !== 'walk' && resolved !== 'wander') {
    wander = null;
  }
  return resolved;
}

function clipFor(choice) {
  switch (choice) {
    case 'dragging':
      return 'PET_DRAGGING';
    case 'fall':
      return 'PET_FALL';
    case 'ragdoll':
    case 'glance':
      return 'PET_IDLE';
    case 'walk':
    case 'wander':
      return 'PET_WALK_RIGHT';
    default:
      return actions.is('touch') ? 'FACE_HAIR_STROKE'
        : actions.is('hover') ? 'HoverReaction'
        : actions.is('happy') ? 'PET_HAPPY'
        : actions.is('dance') ? 'PET_DANCING'
        : 'PET_IDLE';
  }
}

function faceWalk(delta) {
  player.rotation.z += (0 - player.rotation.z) * Math.min(1, delta * 6);
  const target = wander && !holding ? (wander.face > 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
  let diff = target - faceYaw.current;
  while (diff > Math.PI) {
    diff -= Math.PI * 2;
  }
  while (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  faceYaw.current += diff * Math.min(1, delta * 8);
  player.rotation.y = faceYaw.current;
}

function lookAtPointer(delta) {
  if (phase === 'ragdoll' || phase === 'glance' || falling || (wander && !holding)) {
    return;
  }
  rig.updateWorldMatrix(true, true);
  bones.head.getWorldPosition(headPoint);
  const dx = pointer.x - headPoint.x;
  const dy = pointer.y - (-headPoint.y);
  const yaw = Math.max(-0.75, Math.min(0.75, Math.atan2(dx, 260)));
  const pitch = Math.max(-0.55, Math.min(0.6, Math.atan2(dy, 260)));
  const blend = Math.min(1, delta * 10);
  look.yaw += (yaw - look.yaw) * blend;
  look.pitch += (pitch - look.pitch) * blend;
  bones.head.rotation.y = look.yaw;
  bones.head.rotation.x = look.pitch;
}

function applyPose(delta) {
  if (holding) {
    falling = false;
  }
  const clip = clipFor(frameChoice);
  if (clip !== poseName) {
    poseName = clip;
    poseTime = 0;
  } else {
    poseTime += delta;
  }
  if (phase !== 'ragdoll') {
    faceWalk(delta);
  }
  if (holding && phase !== 'ragdoll') {
    player.position.y = -HEAD * SCALE;
  } else {
    player.position.y = FEET * SCALE;
  }
  playClip(bones, clip, poseTime, swing);
  if (phase === 'ragdoll' && doll) {
    syncDoll(doll);
  } else if (phase === 'glance') {
    bones.head.rotation.x = -0.35;
    bones.head.rotation.y = Math.sin(phaseTime * 3.2) * 0.55;
    bones.spine.rotation.x = -0.08;
  }
  lookAtPointer(delta);
  if (falling) {
    fallYaw += delta * 0.55;
  } else {
    fallYaw += (0 - fallYaw) * Math.min(1, delta * 3);
  }
  rig.rotation.y = fallYaw;
}

function place(delta) {
  frameChoice = think(delta);
  if (frameChoice === 'walk' || frameChoice === 'wander') {
    stepWander(delta);
  }
  if (holding && phase === 'ragdoll' && doll) {
    const vel = dragVelocity(delta);
    if (Math.hypot(vel.x, vel.y) > 2800) {
      releaseNeck(doll, vel.x, vel.y);
      holding = false;
      pressing = false;
    } else if (doll.pin) {
      grabNeck(doll, pointer.x, pointer.y);
    }
  }
  if (phase === 'ragdoll' && doll) {
    const state = stepDoll(doll, delta, -floorY(), window.innerWidth);
    const body = doll.parts[0].body;
    body.updateMesh();
    const pos = body.getPosition();
    pet.x = pos.x;
    pet.y = -pos.y;
    const onBar = state.y < -floorY() + 80;
    const lying = !doll.pin && onBar && (state.speed < 160 || (doll.rest > 0.25 && state.speed < 280));
    if (lying) {
      doll.rest += delta;
      if (doll.rest >= 6) {
        releaseDoll(doll);
        doll = null;
        phase = 'glance';
        phaseTime = 0;
        pet.mode = 'idle';
        pet.y = floorY();
      }
    } else {
      doll.rest = 0;
    }
  } else if (phase === 'glance') {
    pet.y = floorY();
    if (phaseTime > 1.05) {
      phase = null;
      pet.mode = 'idle';
    }
  } else if (falling) {
    pet.y = Math.min(floorY(), pet.y + 46 * delta);
    if (pet.y >= floorY() - 1) {
      pet.y = floorY();
      falling = false;
      pet.mode = 'idle';
      actions.handle('drag-end');
    }
  } else if (!holding && pet.mode === 'idle') {
    pet.y += (floorY() - pet.y) * Math.min(1, delta * 8);
  }
  swing.x += (0 - swing.x) * Math.min(1, delta * 4);
  swing.z += (0 - swing.z) * Math.min(1, delta * 4);
  rig.position.set(pet.x, -pet.y, 0);
  applyPose(delta);
}

function bodyHeight() {
  return (22 - -16.25) * SCALE;
}

function hitRect() {
  const height = bodyHeight();
  if (holding) {
    return {x: pet.x - 28, y: pet.y - 36, width: 56, height};
  }
  return {x: pet.x - 28, y: pet.y - height, width: 56, height};
}

function bindPointer() {
  window.addEventListener('pointerdown', (event) => {
    const rect = hitRect();
    const over = event.clientX >= rect.x && event.clientX <= rect.x + rect.width
      && event.clientY >= rect.y && event.clientY <= rect.y + rect.height;
    if (!over) {
      return;
    }
    pressing = true;
    hovering = false;
    pressX = event.clientX;
    pressY = event.clientY;
    lastPointer = {x: event.clientX, y: event.clientY};
  });
  window.addEventListener('pointermove', (event) => {
    const rect = hitRect();
    const over = event.clientX >= rect.x && event.clientX <= rect.x + rect.width
      && event.clientY >= rect.y && event.clientY <= rect.y + rect.height;
    if (!holding && over && !hovering) {
      hovering = true;
      actions.handle('hover');
    }
    if (!over) {
      hovering = false;
    }
    if (pressing && !holding) {
      const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);
      if (moved > 8) {
        holding = true;
        falling = false;
        beginDragDoll(event.clientX, event.clientY);
        actions.handle('drag-start');
      }
    }
    if (!holding) {
      return;
    }
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    lastPointer = {x: event.clientX, y: event.clientY};
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pet.x = event.clientX;
    pet.y = event.clientY;
    swing.z = Math.max(-0.7, Math.min(0.7, dx * 0.02));
    swing.x = Math.max(-0.45, Math.min(0.45, dy * 0.015));
  });
  window.addEventListener('pointerup', (event) => {
    if (!pressing && !holding) {
      return;
    }
    const wasHolding = holding;
    pressing = false;
    holding = false;
    const moved = Math.hypot(event.clientX - pressX, event.clientY - pressY);
    if (!wasHolding || moved < 10) {
      const now = performance.now();
      if (now - lastTap < 320) {
        actions.handle('dance');
      } else {
        actions.handle('touch');
      }
      lastTap = now;
      return;
    }
    if (doll) {
      releaseNeck(doll, dragVel.x, dragVel.y);
      phase = 'ragdoll';
      pet.mode = 'ragdoll';
      return;
    }
    if (event.clientY < floorY() - 36) {
      falling = true;
      pet.mode = 'fall';
      pet.y = event.clientY;
      actions.handle('idle');
      return;
    }
    falling = false;
    pet.mode = 'idle';
    pet.y = floorY();
    actions.handle('drag-end');
  });
}

function frame(now) {
  const delta = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  try {
    place(delta);
    renderer.render(scene, camera);
  } catch (error) {
    if (status) {
      status.textContent = error instanceof Error ? error.message : String(error);
    }
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
pet.x = Math.round(window.innerWidth * 0.45);
pet.y = floorY();
resize();
bindPointer();
actions.handle('boot');
requestAnimationFrame(frame);
