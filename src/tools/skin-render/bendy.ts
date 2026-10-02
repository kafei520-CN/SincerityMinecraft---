/**
 * 可弯曲肢体几何：将 12 像素的肢体分为两段各 6 像素，中间铰链关节。
 *
 * Minecraft 标准玩家模型：
 * - 右臂/左臂：4×12×4 像素 (slim 是 3×12×4)
 * - 右腿/左腿：4×12×4 像素
 *
 * 分段策略：
 * - 上段：从肩膀/髋部开始 6 像素
 * - 下段：剩余 6 像素到手腕/脚踝
 * - 关节：在 Y=6 处，两段通过斜接(miter)无缝连接
 */

export interface BendyLimb {
  upper: {
    positions: number[];  // 9 floats per triangle: v0.xyz, v1.xyz, v2.xyz
    normals: number[];    // 9 floats per triangle
    uvs: number[];        // 6 floats per triangle: u0,v0, u1,v1, u2,v2
  };
  lower: {
    positions: number[];
    normals: number[];
    uvs: number[];
  };
  jointY: number;         // 关节的 Y 坐标（局部空间）
}

/**
 * UV 布局 (64×64 皮肤):
 * 右臂：u=40-48, v=16-32 (default) 或 u=40-47, v=16-32 (slim)
 * 左臂：u=32-40, v=48-64 (default) 或 u=32-39, v=48-64 (slim)
 * 右腿：u=0-8, v=16-32
 * 左腿：u=16-24, v=48-64
 */

function box(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  u: number, v: number,
  w: number, h: number,
  skinW: number, skinH: number
): {positions: number[]; normals: number[]; uvs: number[]} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;

  // UV 偏移 (Minecraft box UV 布局)
  // 前后左右上下，按 Blockbench 的标准展开
  const d = dz;
  const w2 = dx;
  const h2 = dy;

  // 每个面两个三角形
  function quad(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    dx: number, dy: number, dz: number,
    nx: number, ny: number, nz: number,
    u0: number, v0: number, u1: number, v1: number
  ) {
    const su0 = u0 / skinW;
    const sv0 = v0 / skinH;
    const su1 = u1 / skinW;
    const sv1 = v1 / skinH;
    // 三角形 1: a, b, c
    positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(su0, sv0, su1, sv0, su1, sv1);
    // 三角形 2: a, c, d
    positions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
    normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    uvs.push(su0, sv0, su1, sv1, su0, sv1);
  }

  // 前面 (+Z)
  quad(
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
    0, 0, 1,
    u + d, v + d, u + d + w2, v + d + h2
  );

  // 后面 (-Z)
  quad(
    x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0,
    0, 0, -1,
    u + d + w2 + d, v + d, u + d + w2 + d + w2, v + d + h2
  );

  // 右面 (+X)
  quad(
    x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1,
    1, 0, 0,
    u + d + w2, v + d, u + d + w2 + d, v + d + h2
  );

  // 左面 (-X)
  quad(
    x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0,
    -1, 0, 0,
    u, v + d, u + d, v + d + h2
  );

  // 上面 (+Y)
  quad(
    x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0,
    0, 1, 0,
    u + d, v, u + d + w2, v + d
  );

  // 下面 (-Y)
  quad(
    x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1,
    0, -1, 0,
    u + d + w2, v, u + d + w2 + w2, v + d
  );

  return {positions, normals, uvs};
}

export function createBendyArm(isSlim: boolean, isLeft: boolean): BendyLimb {
  const skinW = 64;
  const skinH = 64;
  const limbW = isSlim ? 3 : 4;
  const limbH = 12;
  const limbD = 4;

  // UV 起点
  let u: number, v: number;
  if (isLeft) {
    u = 32;
    v = 48;
  } else {
    u = 40;
    v = 16;
  }

  // 上段：Y 从 6 到 12 (肩膀端)
  const upperHalf = box(
    -limbW / 2, 6, -limbD / 2,
    limbW / 2, 12, limbD / 2,
    u, v, limbW, 6, skinW, skinH
  );

  // 下段：Y 从 0 到 6 (手腕端)
  const lowerHalf = box(
    -limbW / 2, 0, -limbD / 2,
    limbW / 2, 6, limbD / 2,
    u, v + 6, limbW, 6, skinW, skinH
  );

  return {
    upper: upperHalf,
    lower: lowerHalf,
    jointY: 6
  };
}

export function createBendyLeg(isLeft: boolean): BendyLimb {
  const skinW = 64;
  const skinH = 64;
  const limbW = 4;
  const limbH = 12;
  const limbD = 4;

  // UV 起点
  let u: number, v: number;
  if (isLeft) {
    u = 16;
    v = 48;
  } else {
    u = 0;
    v = 16;
  }

  // 上段：Y 从 6 到 12 (髋部端)
  const upperHalf = box(
    -limbW / 2, 6, -limbD / 2,
    limbW / 2, 12, limbD / 2,
    u, v, limbW, 6, skinW, skinH
  );

  // 下段：Y 从 0 到 6 (脚踝端)
  const lowerHalf = box(
    -limbW / 2, 0, -limbD / 2,
    limbW / 2, 6, limbD / 2,
    u, v + 6, limbW, 6, skinW, skinH
  );

  return {
    upper: upperHalf,
    lower: lowerHalf,
    jointY: 6
  };
}

/**
 * 应用弯曲变换：
 * - shoulderPos: 肩膀/髋部的世界坐标
 * - shoulderRot: 上段的旋转 (度，XYZ 欧拉角)
 * - elbowBend: 下段相对关节的额外旋转 (度，仅 X 轴)
 * 返回变换后的世界空间三角形
 */
export function applyBend(
  limb: BendyLimb,
  shoulderPos: [number, number, number],
  shoulderRot: [number, number, number],
  elbowBend: number
): {positions: number[]; normals: number[]; uvs: number[]} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // 构建上段变换矩阵 (肩膀旋转)
  const rx = shoulderRot[0] * Math.PI / 180;
  const ry = shoulderRot[1] * Math.PI / 180;
  const rz = shoulderRot[2] * Math.PI / 180;

  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Z·Y·X 旋转顺序
  const m00 = cy * cz;
  const m01 = cy * sz;
  const m02 = -sy;
  const m10 = sx * sy * cz - cx * sz;
  const m11 = sx * sy * sz + cx * cz;
  const m12 = sx * cy;
  const m20 = cx * sy * cz + sx * sz;
  const m21 = cx * sy * sz - sx * cz;
  const m22 = cx * cy;

  // 变换上段三角形
  for (let i = 0; i < limb.upper.positions.length; i += 3) {
    const x = limb.upper.positions[i];
    const y = limb.upper.positions[i + 1];
    const z = limb.upper.positions[i + 2];
    positions.push(
      m00 * x + m01 * y + m02 * z + shoulderPos[0],
      m10 * x + m11 * y + m12 * z + shoulderPos[1],
      m20 * x + m21 * y + m22 * z + shoulderPos[2]
    );
  }

  // 变换上段法线
  for (let i = 0; i < limb.upper.normals.length; i += 3) {
    const nx = limb.upper.normals[i];
    const ny = limb.upper.normals[i + 1];
    const nz = limb.upper.normals[i + 2];
    normals.push(
      m00 * nx + m01 * ny + m02 * nz,
      m10 * nx + m11 * ny + m12 * nz,
      m20 * nx + m21 * ny + m22 * nz
    );
  }

  uvs.push(...limb.upper.uvs);

  // 构建关节处的额外旋转（肘部/膝盖弯曲）
  const eb = elbowBend * Math.PI / 180;
  const ceb = Math.cos(eb);
  const seb = Math.sin(eb);

  // 关节在上段变换后的世界坐标
  const jointX = m02 * limb.jointY + shoulderPos[0];
  const jointY = m12 * limb.jointY + shoulderPos[1];
  const jointZ = m22 * limb.jointY + shoulderPos[2];

  // 变换下段三角形：先应用肘部旋转，再应用肩膀旋转，再平移
  for (let i = 0; i < limb.lower.positions.length; i += 3) {
    const x = limb.lower.positions[i];
    const y = limb.lower.positions[i + 1];
    const z = limb.lower.positions[i + 2];

    // 肘部绕 X 轴旋转
    const y1 = ceb * y - seb * z;
    const z1 = seb * y + ceb * z;

    // 肩膀旋转
    const wx = m00 * x + m01 * y1 + m02 * z1;
    const wy = m10 * x + m11 * y1 + m12 * z1;
    const wz = m20 * x + m21 * y1 + m22 * z1;

    positions.push(wx + jointX, wy + jointY, wz + jointZ);
  }

  // 变换下段法线
  for (let i = 0; i < limb.lower.normals.length; i += 3) {
    const nx = limb.lower.normals[i];
    const ny = limb.lower.normals[i + 1];
    const nz = limb.lower.normals[i + 2];

    const ny1 = ceb * ny - seb * nz;
    const nz1 = seb * ny + ceb * nz;

    normals.push(
      m00 * nx + m01 * ny1 + m02 * nz1,
      m10 * nx + m11 * ny1 + m12 * nz1,
      m20 * nx + m21 * ny1 + m22 * nz1
    );
  }

  uvs.push(...limb.lower.uvs);

  return {positions, normals, uvs};
}
