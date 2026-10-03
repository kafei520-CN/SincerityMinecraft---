import * as THREE from 'three';
import {adoptMesh, createTexture, type TraceElement, type TracerTexture} from './host';

const SCRIPT = '/vendor/block-model-renderer/block-model-renderer.min.js';
const ASSETS = '/vendor/block-model-renderer/assets.zip';

interface BmrModule {
  configure: (opts: {three?: typeof THREE; assetsUrl?: string | false}) => void;
  prepareAssets: (assets: unknown, opts?: {cache?: boolean}) => Promise<unknown>;
  parseItemDefinition: (assets: unknown, id: string, args?: Record<string, unknown>) => Promise<unknown[]>;
  parseBlockstate: (assets: unknown, id: string, args?: Record<string, unknown>) => Promise<unknown[]>;
  resolveModelData: (assets: unknown, model: unknown) => Promise<unknown>;
  loadModel: (scene: THREE.Object3D, assets: unknown, model: unknown, args?: Record<string, unknown>) => Promise<THREE.Object3D>;
}

export interface PackModel {
  object: THREE.Group;
  elements: TraceElement[];
  texture?: TracerTexture;
  name: string;
  kind: 'item' | 'block';
}

let loading: Promise<BmrModule> | null = null;

function loadBmr(): Promise<BmrModule> {
  if (!loading) {
    loading = (async () => {
      const href = new URL(SCRIPT, window.location.origin).href;
      const importer = new Function('u', 'return import(u)') as (url: string) => Promise<BmrModule>;
      const mod = await importer(href);
      mod.configure({three: THREE, assetsUrl: new URL(ASSETS, window.location.origin).href});
      return mod;
    })();
  }
  return loading;
}

export async function preparePack(zip: ArrayBuffer): Promise<unknown> {
  const bmr = await loadBmr();
  return bmr.prepareAssets([zip], {cache: true});
}

export function modelKind(id: string): 'item' | 'block' {
  const rest = id.includes(':') ? id.split(':')[1] ?? id : id;
  return rest.startsWith('block/') ? 'block' : 'item';
}

function shortId(id: string): string {
  const rest = id.includes(':') ? id.split(':')[1] ?? id : id;
  return rest.replace(/^(item|block)\//, '');
}

function namespaced(id: string): string {
  if (id.includes(':') && !id.includes('/')) {
    return id;
  }
  const ns = id.includes(':') ? id.split(':')[0] || 'minecraft' : 'minecraft';
  return `${ns}:${shortId(id)}`;
}

export async function buildPackModel(assets: unknown, id: string): Promise<PackModel> {
  const bmr = await loadBmr();
  const kind = modelKind(id);
  const key = namespaced(id);
  const name = shortId(id).split('/').pop() ?? id;
  const holder = new THREE.Group();
  holder.name = name;
  const models = kind === 'block'
    ? await bmr.parseBlockstate(assets, key, {ignoreAtlases: true})
    : await bmr.parseItemDefinition(assets, key, {ignoreAtlases: true, display: 'thirdperson_righthand'});
  const display = kind === 'block'
    ? {rotation: [0, 0, 0], translation: [0, 0, 0], scale: [1, 1, 1]}
    : 'thirdperson_righthand';
  for (const model of models) {
    const resolved = await bmr.resolveModelData(assets, model);
    await bmr.loadModel(holder, assets, resolved, {display, lighting: 'off', animate: false});
  }
  const pieces = flattenMeshes(holder, name);
  if (pieces.length === 0) {
    throw new Error('模型是空的');
  }
  return {object: holder, elements: pieces.map((piece) => piece.element), texture: pieces[0]?.texture, name, kind};
}

function flattenMeshes(root: THREE.Object3D, name: string): Array<{element: TraceElement; texture: TracerTexture}> {
  const pieces: Array<{element: TraceElement; texture: TracerTexture}> = [];
  const originals: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      originals.push(obj as THREE.Mesh);
    }
  });
  let index = 0;
  for (const mesh of originals) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = mesh.geometry.groups ?? [];
    const slices = materials.length > 1 && groups.length > 0
      ? groups.map((group, groupIndex) => ({material: materials[group.materialIndex ?? groupIndex], group}))
      : [{material: materials[0], group: null}];
    let split = false;
    for (const slice of slices) {
      if (!slice.material || slice.material.visible === false) {
        continue;
      }
      const canvas = bakeMap(slice.material);
      if (!canvas) {
        continue;
      }
      const texture = createTexture(pieces.length ? `${name} ${index + 1}` : name, canvas, canvas.width, canvas.height);
      let target = mesh;
      if (slice.group) {
        target = splitGroup(mesh, slice.group, texture.material);
        copyLocal(mesh, target);
        (mesh.parent ?? root).add(target);
        split = true;
      } else {
        target.material = texture.material;
      }
      pieces.push({element: adoptMesh(target, texture, texture.name), texture});
      index += 1;
    }
    if (split) {
      mesh.visible = false;
    }
  }
  return pieces;
}

function copyLocal(from: THREE.Object3D, to: THREE.Object3D): void {
  to.position.copy(from.position);
  to.quaternion.copy(from.quaternion);
  to.scale.copy(from.scale);
  to.matrix.copy(from.matrix);
  to.matrixAutoUpdate = from.matrixAutoUpdate;
}

function splitGroup(mesh: THREE.Mesh, group: {start: number; count: number; materialIndex?: number}, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const source = mesh.geometry;
  geometry.setAttribute('position', source.getAttribute('position'));
  const normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv');
  if (normal) {
    geometry.setAttribute('normal', normal);
  }
  if (uv) {
    geometry.setAttribute('uv', uv);
  }
  const index = source.index;
  if (index) {
    geometry.setIndex(Array.from(index.array.slice(group.start, group.start + group.count)));
  }
  const child = new THREE.Mesh(geometry, material);
  child.name = mesh.name;
  return child;
}

function bakeMap(material: THREE.Material): HTMLCanvasElement | null {
  const shader = material as THREE.Material & {map?: THREE.Texture; uniforms?: {map?: {value?: THREE.Texture}}};
  const map = shader.uniforms?.map?.value ?? shader.map;
  const image = map?.image as CanvasImageSource | {width?: number; height?: number} | undefined;
  if (!image) {
    return null;
  }
  const width = Number((image as HTMLCanvasElement).width ?? 0);
  const height = Number((image as HTMLCanvasElement).height ?? 0);
  if (!width || !height) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  try {
    ctx.drawImage(image as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }
  return canvas;
}
