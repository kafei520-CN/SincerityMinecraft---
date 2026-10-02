import * as THREE from 'three';

/** Blockbench / Minecraft 盒子展开的面序：东、西、上、下、南、北。 */
export const FACE_ORDER = ['east', 'west', 'up', 'down', 'south', 'north'] as const;

type Vec3 = [number, number, number];
type Corner = {p: Vec3; uv: [number, number]};

/**
 * 盒子展开和 Minecraft / Blockbench 的 box UV 一样。
 * 写进几何体的 v 以贴图下沿为 0，和 Blockbench 交给路径追踪的方向一致。
 * 路径追踪会再做一次 1-v，图集的第 0 行又是画面上沿。
 * 预览贴图用 flipY = true，同一套坐标在视口里也是正的。
 */
export function createBoxGeometry(
  from: Vec3,
  to: Vec3,
  uvOrigin: [number, number],
  uvSize: Vec3,
  texW: number,
  texH: number,
): THREE.BufferGeometry {
  const [x0, y0, z0] = from;
  const [x1, y1, z1] = to;
  const [u, v] = uvOrigin;
  const [w, h, d] = uvSize;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const push = (corners: Corner[], normal: Vec3) => {
    const order = [0, 1, 2, 0, 2, 3];
    for (const index of order) {
      const corner = corners[index];
      if (!corner) {
        continue;
      }
      positions.push(corner.p[0], corner.p[1], corner.p[2]);
      normals.push(normal[0], normal[1], normal[2]);
      uvs.push(corner.uv[0] / texW, 1 - corner.uv[1] / texH);
    }
  };

  const right: [number, number, number, number] = [u, v + d, d, h];
  const front: [number, number, number, number] = [u + d, v + d, w, h];
  const left: [number, number, number, number] = [u + d + w, v + d, d, h];
  const back: [number, number, number, number] = [u + d + w + d, v + d, w, h];
  const top: [number, number, number, number] = [u + d, v, w, d];
  const bottom: [number, number, number, number] = [u + d + w, v, w, d];

  // 东 +X，角色左侧。贴图左缘贴在身前。
  push(sideCorners(x1, y0, y1, z0, z1, 1, left), [1, 0, 0]);
  // 西 -X，角色右侧。贴图右缘贴在身前。
  push(sideCorners(x0, y0, y1, z0, z1, -1, right), [-1, 0, 0]);
  push(capCorners(y1, x0, x1, z0, z1, 1, top), [0, 1, 0]);
  push(capCorners(y0, x0, x1, z0, z1, -1, bottom), [0, -1, 0]);
  // 南 +Z，脸。
  push([
    {p: [x0, y0, z1], uv: px(front, 0, 1)},
    {p: [x1, y0, z1], uv: px(front, 1, 1)},
    {p: [x1, y1, z1], uv: px(front, 1, 0)},
    {p: [x0, y1, z1], uv: px(front, 0, 0)},
  ], [0, 0, 1]);
  // 北 -Z，后脑。角色左侧在贴图左缘。
  push([
    {p: [x1, y0, z0], uv: px(back, 0, 1)},
    {p: [x0, y0, z0], uv: px(back, 1, 1)},
    {p: [x0, y1, z0], uv: px(back, 1, 0)},
    {p: [x1, y1, z0], uv: px(back, 0, 0)},
  ], [0, 0, -1]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function px(rect: [number, number, number, number], across: 0 | 1, down: 0 | 1): [number, number] {
  return [rect[0] + rect[2] * across, rect[1] + rect[3] * down];
}

function sideCorners(
  x: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  sign: 1 | -1,
  rect: [number, number, number, number],
): Corner[] {
  if (sign > 0) {
    return [
      {p: [x, y0, z1], uv: px(rect, 0, 1)},
      {p: [x, y0, z0], uv: px(rect, 1, 1)},
      {p: [x, y1, z0], uv: px(rect, 1, 0)},
      {p: [x, y1, z1], uv: px(rect, 0, 0)},
    ];
  }
  return [
    {p: [x, y0, z0], uv: px(rect, 0, 1)},
    {p: [x, y0, z1], uv: px(rect, 1, 1)},
    {p: [x, y1, z1], uv: px(rect, 1, 0)},
    {p: [x, y1, z0], uv: px(rect, 0, 0)},
  ];
}

function capCorners(
  y: number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  sign: 1 | -1,
  rect: [number, number, number, number],
): Corner[] {
  if (sign > 0) {
    return [
      {p: [x0, y, z1], uv: px(rect, 0, 1)},
      {p: [x1, y, z1], uv: px(rect, 1, 1)},
      {p: [x1, y, z0], uv: px(rect, 1, 0)},
      {p: [x0, y, z0], uv: px(rect, 0, 0)},
    ];
  }
  return [
    {p: [x0, y, z0], uv: px(rect, 0, 0)},
    {p: [x1, y, z0], uv: px(rect, 1, 0)},
    {p: [x1, y, z1], uv: px(rect, 1, 1)},
    {p: [x0, y, z1], uv: px(rect, 0, 1)},
  ];
}

/** 整张贴图铺在正反两面，给资源包里的平面物品（镐、剑）用。v 向下增大。 */
export function texturePlane(width: number, height: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const push = (corners: Array<[number, number, number, number, number]>, normal: Vec3) => {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const corner = corners[index];
      if (!corner) {
        continue;
      }
      positions.push(corner[0], corner[1], corner[2]);
      normals.push(normal[0], normal[1], normal[2]);
      uvs.push(corner[3], corner[4]);
    }
  };
  push([
    [0, 0, 0.2, 0, 0],
    [width, 0, 0.2, 1, 0],
    [width, height, 0.2, 1, 1],
    [0, height, 0.2, 0, 1],
  ], [0, 0, 1]);
  push([
    [width, 0, 0, 0, 0],
    [0, 0, 0, 1, 0],
    [0, height, 0, 1, 1],
    [width, height, 0, 0, 1],
  ], [0, 0, -1]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}
