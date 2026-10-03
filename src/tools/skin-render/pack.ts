import * as THREE from 'three';
import {createBoxGeometry, texturePlane} from './boxUv';

type Vec3 = [number, number, number];

interface JavaFace {
  uv?: [number, number, number, number];
  texture?: string;
}

interface JavaModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: Array<{
    from: Vec3;
    to: Vec3;
    rotation?: {origin: Vec3; axis: 'x' | 'y' | 'z'; angle: number};
    faces?: Record<string, JavaFace>;
  }>;
}

export async function unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const min = Math.max(0, bytes.length - 22 - 65536);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('这不是 zip 资源包');
  }
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      break;
    }
    const method = view.getUint16(cursor + 10, true);
    const compSize = view.getUint32(cursor + 20, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localOff = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen)).replaceAll('\\', '/');
    cursor += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) {
      continue;
    }
    const localNameLen = view.getUint16(localOff + 26, true);
    const localExtraLen = view.getUint16(localOff + 28, true);
    const dataOff = localOff + 30 + localNameLen + localExtraLen;
    const compressed = bytes.subarray(dataOff, dataOff + compSize);
    const raw = method === 0 ? compressed : await inflate(compressed);
    if (raw) {
      files.set(packKey(name), raw);
    }
  }
  return files;
}

function packKey(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  const at = normalized.toLowerCase().indexOf('assets/');
  return at >= 0 ? normalized.slice(at) : normalized;
}

async function inflate(compressed: Uint8Array): Promise<Uint8Array | null> {
  try {
    const buffer = new ArrayBuffer(compressed.byteLength);
  new Uint8Array(buffer).set(compressed);
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

const SKIP_BLOCKS = new Set(['air', 'cave_air', 'void_air', 'moving_piston']);

export function listPackItems(files: Map<string, Uint8Array>): string[] {
  const names = new Set<string>();
  for (const path of files.keys()) {
    const itemModel = /^assets\/([^/]+)\/models\/item\/(.+)\.json$/i.exec(path);
    if (itemModel?.[1] && itemModel[2]) {
      names.add(`${itemModel[1]}:item/${itemModel[2]}`.replace(/item\/item\//, 'item/'));
      continue;
    }
    const definition = /^assets\/([^/]+)\/items\/(.+)\.json$/i.exec(path);
    if (definition?.[1] && definition[2]) {
      names.add(`${definition[1]}:item/${definition[2]}`);
      continue;
    }
    const itemTexture = /^assets\/([^/]+)\/textures\/items?\/([^/]+)\.png$/i.exec(path);
    if (itemTexture?.[1] && itemTexture[2]) {
      names.add(`${itemTexture[1]}:item/${itemTexture[2]}`);
      continue;
    }
    const blockState = /^assets\/([^/]+)\/blockstates\/(.+)\.json$/i.exec(path);
    if (blockState?.[1] && blockState[2] && !SKIP_BLOCKS.has(blockState[2])) {
      names.add(`${blockState[1]}:block/${blockState[2]}`);
      continue;
    }
    const blockModel = /^assets\/([^/]+)\/models\/block\/(.+)\.json$/i.exec(path);
    if (blockModel?.[1] && blockModel[2] && !SKIP_BLOCKS.has(blockModel[2])) {
      names.add(`${blockModel[1]}:block/${blockModel[2]}`);
      continue;
    }
    const blockTexture = /^assets\/([^/]+)\/textures\/block\/([^/]+)\.png$/i.exec(path);
    if (blockTexture?.[1] && blockTexture[2] && !SKIP_BLOCKS.has(blockTexture[2])) {
      names.add(`${blockTexture[1]}:block/${blockTexture[2]}`);
    }
  }
  return [...names].sort();
}

export async function itemMesh(files: Map<string, Uint8Array>, id: string): Promise<{geometry: THREE.BufferGeometry; png: Uint8Array; name: string}> {
  const model = gather(files, id);
  const layer = model.textures?.layer0 || model.textures?.particle || Object.values(model.textures ?? {})[0];
  const png = (layer && !layer.startsWith('#') ? textureBytes(files, layer) : null) ?? textureBytes(files, id) ?? texturePng(files, id);
  if (!png) {
    throw new Error('资源包里没有这张贴图');
  }
  const name = (id.split(':')[1] ?? id).split('/').pop() ?? id;
  if (!model.elements?.length) {
    return {geometry: texturePlane(16, 16), png, name};
  }
  return {geometry: elementsGeometry(model), png, name};
}

function gather(files: Map<string, Uint8Array>, id: string, depth = 0): JavaModel {
  if (depth > 8) {
    return {};
  }
  const json = readModel(files, id);
  if (!json) {
    return {};
  }
  const parent = json.parent ? gather(files, json.parent, depth + 1) : {};
  const textures = {...parent.textures};
  for (const [key, value] of Object.entries(json.textures ?? {})) {
    textures[key] = value.startsWith('#') ? textures[value.slice(1)] ?? value : value;
  }
  return {textures, elements: json.elements ?? parent.elements};
}

function splitId(id: string): [string, string] {
  if (id.includes(':')) {
    const [namespace, rest] = id.split(':');
    return [namespace || 'minecraft', rest || ''];
  }
  return ['minecraft', id];
}

function readModel(files: Map<string, Uint8Array>, id: string): JavaModel | null {
  const [namespace, rest] = splitId(id);
  const bytes = files.get(`assets/${namespace}/models/${rest}.json`)
    ?? files.get(`assets/${namespace}/models/item/${rest}.json`)
    ?? files.get(`assets/${namespace}/items/${rest.replace(/^item\//, '')}.json`);
  if (!bytes) {
    return null;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as JavaModel;
}

function textureBytes(files: Map<string, Uint8Array>, id: string): Uint8Array | null {
  const [namespace, rest] = splitId(id);
  return files.get(`assets/${namespace}/textures/${rest}.png`)
    ?? files.get(`assets/${namespace}/textures/item/${rest}.png`)
    ?? files.get(`assets/${namespace}/textures/items/${rest}.png`)
    ?? null;
}

function texturePng(files: Map<string, Uint8Array>, id: string): Uint8Array | null {
  const [namespace, rest] = splitId(id);
  const short = rest.split('/').pop() ?? rest;
  return files.get(`assets/${namespace}/textures/item/${short}.png`)
    ?? files.get(`assets/${namespace}/textures/items/${short}.png`)
    ?? null;
}

function elementsGeometry(model: JavaModel): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const element of model.elements ?? []) {
    const geometry = createBoxGeometry(element.from, element.to, [0, 0], [
      element.to[0] - element.from[0],
      element.to[1] - element.from[1],
      element.to[2] - element.from[2],
    ], 16, 16);
    const faceUv = element.faces ?? {};
    stampFaceUvs(geometry, faceUv);
    append(geometry, positions, normals, uvs, element.rotation);
    geometry.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function stampFaceUvs(geometry: THREE.BufferGeometry, faces: Record<string, JavaFace>): void {
  const uv = geometry.getAttribute('uv');
  const order = ['east', 'west', 'up', 'down', 'south', 'north'];
  order.forEach((name, faceIndex) => {
    const face = faces[name];
    if (!face?.uv) {
      return;
    }
    const [u0, v0, u1, v1] = face.uv;
    const corners: Array<[number, number]> = [
      [u0 / 16, v1 / 16],
      [u1 / 16, v1 / 16],
      [u1 / 16, v0 / 16],
      [u0 / 16, v1 / 16],
      [u1 / 16, v0 / 16],
      [u0 / 16, v0 / 16],
    ];
    corners.forEach((corner, cornerIndex) => {
      uv.setXY(faceIndex * 6 + cornerIndex, corner[0], 1 - corner[1]);
    });
  });
}

function append(
  geometry: THREE.BufferGeometry,
  positions: number[],
  normals: number[],
  uvs: number[],
  rotation?: {origin: Vec3; axis: 'x' | 'y' | 'z'; angle: number},
): void {
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    if (rotation) {
      [x, y, z] = rotate(x, y, z, rotation);
    }
    positions.push(x, y, z);
    normals.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    uvs.push(uv.getX(i), uv.getY(i));
  }
}

function rotate(x: number, y: number, z: number, rotation: {origin: Vec3; axis: 'x' | 'y' | 'z'; angle: number}): Vec3 {
  const [ox, oy, oz] = rotation.origin;
  let px = x - ox;
  let py = y - oy;
  let pz = z - oz;
  const rad = rotation.angle * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  if (rotation.axis === 'x') {
    [py, pz] = [py * c - pz * s, py * s + pz * c];
  } else if (rotation.axis === 'y') {
    [px, pz] = [px * c + pz * s, -px * s + pz * c];
  } else {
    [px, py] = [px * c - py * s, px * s + py * c];
  }
  return [px + ox, py + oy, pz + oz];
}
