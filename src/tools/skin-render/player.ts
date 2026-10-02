import * as THREE from 'three';
import {createBoxGeometry} from './boxUv';

type Vec3 = [number, number, number];

interface LayerSpec {
  uv: [number, number];
  inflate: number;
}

interface PartSpec {
  id: string;
  name: string;
  pivot: Vec3;
  from: Vec3;
  to: Vec3;
  uv: [number, number];
  uvSize: Vec3;
  layers: LayerSpec[];
}

export interface BuiltPart {
  id: string;
  name: string;
  pivot: THREE.Group;
  meshes: THREE.Mesh[];
}

export function partSpecs(slim: boolean): PartSpec[] {
  const armW = slim ? 3 : 4;
  return [
    {
      id: 'head',
      name: '头',
      pivot: [0, 24, 0],
      from: [-4, 24, -4],
      to: [4, 32, 4],
      uv: [0, 0],
      uvSize: [8, 8, 8],
      layers: [{uv: [32, 0], inflate: 0.5}],
    },
    {
      id: 'body',
      name: '身体',
      pivot: [0, 24, 0],
      from: [-4, 12, -2],
      to: [4, 24, 2],
      uv: [16, 16],
      uvSize: [8, 12, 4],
      layers: [{uv: [16, 32], inflate: 0.25}],
    },
    {
      id: 'rightArm',
      name: '右臂',
      pivot: [-5, 22, 0],
      from: [slim ? -7 : -8, 12, -2],
      to: [-4, 24, 2],
      uv: [40, 16],
      uvSize: [armW, 12, 4],
      layers: [{uv: [40, 32], inflate: 0.25}],
    },
    {
      id: 'leftArm',
      name: '左臂',
      pivot: [5, 22, 0],
      from: [4, 12, -2],
      to: [slim ? 7 : 8, 24, 2],
      uv: [32, 48],
      uvSize: [armW, 12, 4],
      layers: [{uv: [48, 48], inflate: 0.25}],
    },
    {
      id: 'rightLeg',
      name: '右腿',
      pivot: [-2, 12, 0],
      from: [-4, 0, -2],
      to: [0, 12, 2],
      uv: [0, 16],
      uvSize: [4, 12, 4],
      layers: [{uv: [0, 32], inflate: 0.25}],
    },
    {
      id: 'leftLeg',
      name: '左腿',
      pivot: [2, 12, 0],
      from: [0, 0, -2],
      to: [4, 12, 2],
      uv: [16, 48],
      uvSize: [4, 12, 4],
      layers: [{uv: [0, 48], inflate: 0.25}],
    },
  ];
}

export function buildPlayer(slim: boolean, material: THREE.Material, texW: number, texH: number): BuiltPart[] {
  const scale = texW / 64;
  return partSpecs(slim).map((spec) => {
    const pivot = new THREE.Group();
    pivot.name = spec.name;
    pivot.position.set(spec.pivot[0], spec.pivot[1], spec.pivot[2]);
    pivot.rotation.order = 'XYZ';
    const meshes = [addBox(pivot, spec.pivot, spec.from, spec.to, spec.uv, spec.uvSize, scale, texW, texH, material)];
    for (const layer of spec.layers) {
      const grown = inflate(spec.from, spec.to, layer.inflate);
      meshes.push(addBox(pivot, spec.pivot, grown.from, grown.to, layer.uv, spec.uvSize, scale, texW, texH, material));
    }
    return {id: spec.id, name: spec.name, pivot, meshes};
  });
}

function addBox(
  pivot: THREE.Group,
  origin: Vec3,
  from: Vec3,
  to: Vec3,
  uv: [number, number],
  uvSize: Vec3,
  scale: number,
  texW: number,
  texH: number,
  material: THREE.Material,
): THREE.Mesh {
  const geometry = createBoxGeometry(
    sub(from, origin),
    sub(to, origin),
    [uv[0] * scale, uv[1] * scale],
    [uvSize[0] * scale, uvSize[1] * scale, uvSize[2] * scale],
    texW,
    texH,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  pivot.add(mesh);
  return mesh;
}

function sub(value: Vec3, origin: Vec3): Vec3 {
  return [value[0] - origin[0], value[1] - origin[1], value[2] - origin[2]];
}

function inflate(from: Vec3, to: Vec3, amount: number): {from: Vec3; to: Vec3} {
  return {
    from: [from[0] - amount, from[1] - amount, from[2] - amount],
    to: [to[0] + amount, to[1] + amount, to[2] + amount],
  };
}
