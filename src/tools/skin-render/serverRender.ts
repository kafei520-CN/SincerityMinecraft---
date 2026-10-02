import type * as THREE from 'three';
import type {TraceElement} from './host';

export interface StudioMesh {
  positions: number[];
  uvs: number[];
  normals: number[];
  texture: number;
  emissive: number;
}

export interface StudioJob {
  samples: number;
  width: number;
  height: number;
  fov: number;
  position: [number, number, number];
  target: [number, number, number];
  textures: string[];
  meshes: StudioMesh[];
}

interface ListedElement extends TraceElement {
  lightBrightness?: number;
}

export function collectStudioJob(camera: THREE.PerspectiveCamera, target: THREE.Vector3): StudioJob {
  const root = globalThis as unknown as {Outliner?: {elements: ListedElement[]}};
  const elements = root.Outliner?.elements ?? [];
  const textures: string[] = [];
  const textureIndex = new Map<string, number>();
  const meshes: StudioMesh[] = [];
  for (const element of elements) {
    const mesh = element.mesh;
    const geometry = mesh?.geometry;
    const position = geometry?.getAttribute('position');
    if (!mesh || !position || position.count < 3) {
      continue;
    }
    mesh.updateWorldMatrix(true, false);
    const matrix = mesh.matrixWorld.elements;
    const uv = geometry.getAttribute('uv');
    const normal = geometry.getAttribute('normal');
    const index = geometry.getIndex();
    const count = Math.min(index ? index.count : position.count, 12000);
    const positions: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];
    for (let i = 0; i < count; i++) {
      const vertex = index ? index.getX(i) : i;
      const x = position.getX(vertex);
      const y = position.getY(vertex);
      const z = position.getZ(vertex);
      positions.push(
        matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
        matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
        matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
      );
      uvs.push(uv ? uv.getX(vertex) : 0, uv ? uv.getY(vertex) : 0);
      normals.push(normal ? normal.getX(vertex) : 0, normal ? normal.getY(vertex) : 1, normal ? normal.getZ(vertex) : 0);
    }
    const texture = element.faces.east?.texture;
    const key = texture?.uuid ?? '';
    let slot = textureIndex.get(key);
    if (slot === undefined) {
      slot = textures.length;
      textureIndex.set(key, slot);
      textures.push(texture?.canvas.toDataURL('image/png') ?? '');
    }
    meshes.push({
      positions,
      uvs,
      normals,
      texture: slot,
      emissive: texture?.render_mode === 'emissive' ? readBrightness(texture.name) : 0,
    });
  }
  return {
    samples: readSamples(),
    width: 768,
    height: 1024,
    fov: camera.fov,
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: [target.x, target.y, target.z],
    textures,
    meshes,
  };
}

function readSamples(): number {
  const rows = document.querySelectorAll('.ptr_row');
  for (const row of rows) {
    const label = row.querySelector('label')?.textContent ?? '';
    if (label !== '成片采样数' && label !== '预览采样数') {
      continue;
    }
    const input = row.querySelector('input');
    const value = input ? Number(input.value) : 32;
    if (Number.isFinite(value) && value > 0) {
      return Math.max(4, Math.min(128, Math.round(value)));
    }
  }
  return 32;
}

function readBrightness(name: string): number {
  for (const box of document.querySelectorAll('#ptr_matlist .ptr_mat')) {
    if (box.querySelector('.ptr_mat_head span')?.textContent !== name) {
      continue;
    }
    for (const row of box.querySelectorAll('.ptr_row')) {
      if (row.querySelector('label')?.textContent !== '自发光') {
        continue;
      }
      const input = row.querySelector('input[type="number"]');
      const value = input instanceof HTMLInputElement ? Number(input.value) : 1;
      return Number.isFinite(value) ? value : 1;
    }
  }
  return 1;
}

export async function requestGpuRender(job: StudioJob): Promise<string> {
  const response = await fetch('/api/skin-render/', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(job),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as {error?: string} | null;
    throw new Error(payload?.error || '显卡渲染失败');
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
