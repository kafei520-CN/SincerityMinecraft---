/**
 * Minecraft 物品导入：从资源包读取方块/物品模型，转为可渲染的三角形。
 * 支持 Java 版资源包的 assets/<namespace>/models/ 结构。
 */

export interface ItemModel {
  positions: number[];  // 每个三角形 9 floats: v0.xyz, v1.xyz, v2.xyz
  normals: number[];    // 每个三角形 9 floats
  uvs: number[];        // 每个三角形 6 floats: u0,v0, u1,v1, u2,v2
  texturePath: string;  // 纹理路径 (namespace:path)
}

interface JavaElement {
  from: [number, number, number];
  to: [number, number, number];
  rotation?: {
    origin: [number, number, number];
    axis: 'x' | 'y' | 'z';
    angle: number;
  };
  faces?: {
    north?: JavaFace;
    south?: JavaFace;
    east?: JavaFace;
    west?: JavaFace;
    up?: JavaFace;
    down?: JavaFace;
  };
}

interface JavaFace {
  uv?: [number, number, number, number];
  texture?: string;
  rotation?: number;
  cullface?: string;
  tintindex?: number;
}

interface JavaModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: JavaElement[];
}

/**
 * 解析 Java 版模型 JSON。
 * 每个 element 是一个立方体，6个面。
 */
export function parseJavaModel(json: JavaModel): ItemModel {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // 简化：只取第一个纹理
  let texturePath = 'minecraft:block/stone';
  if (json.textures) {
    const firstTex = Object.values(json.textures)[0];
    if (firstTex) {
      texturePath = firstTex.startsWith('#') ? 'minecraft:block/stone' : firstTex;
    }
  }

  const elements = json.elements ?? [];

  for (const elem of elements) {
    const [x0, y0, z0] = elem.from;
    const [x1, y1, z1] = elem.to;

    // Minecraft 坐标：X 向东，Y 向上，Z 向南
    // 转为渲染坐标（Y 向上，X 向右，Z 向外）

    const faces = elem.faces ?? {};

    // 北面 (-Z)
    if (faces.north) {
      const uv = faces.north.uv ?? [x0, 16 - y1, x1, 16 - y0];
      quad(
        x0 / 16, y0 / 16, z0 / 16,
        x1 / 16, y0 / 16, z0 / 16,
        x1 / 16, y1 / 16, z0 / 16,
        x0 / 16, y1 / 16, z0 / 16,
        0, 0, -1,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }

    // 南面 (+Z)
    if (faces.south) {
      const uv = faces.south.uv ?? [x0, 16 - y1, x1, 16 - y0];
      quad(
        x1 / 16, y0 / 16, z1 / 16,
        x0 / 16, y0 / 16, z1 / 16,
        x0 / 16, y1 / 16, z1 / 16,
        x1 / 16, y1 / 16, z1 / 16,
        0, 0, 1,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }

    // 西面 (-X)
    if (faces.west) {
      const uv = faces.west.uv ?? [z0, 16 - y1, z1, 16 - y0];
      quad(
        x0 / 16, y0 / 16, z1 / 16,
        x0 / 16, y0 / 16, z0 / 16,
        x0 / 16, y1 / 16, z0 / 16,
        x0 / 16, y1 / 16, z1 / 16,
        -1, 0, 0,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }

    // 东面 (+X)
    if (faces.east) {
      const uv = faces.east.uv ?? [z0, 16 - y1, z1, 16 - y0];
      quad(
        x1 / 16, y0 / 16, z0 / 16,
        x1 / 16, y0 / 16, z1 / 16,
        x1 / 16, y1 / 16, z1 / 16,
        x1 / 16, y1 / 16, z0 / 16,
        1, 0, 0,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }

    // 下面 (-Y)
    if (faces.down) {
      const uv = faces.down.uv ?? [x0, z0, x1, z1];
      quad(
        x0 / 16, y0 / 16, z0 / 16,
        x1 / 16, y0 / 16, z0 / 16,
        x1 / 16, y0 / 16, z1 / 16,
        x0 / 16, y0 / 16, z1 / 16,
        0, -1, 0,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }

    // 上面 (+Y)
    if (faces.up) {
      const uv = faces.up.uv ?? [x0, z0, x1, z1];
      quad(
        x0 / 16, y1 / 16, z1 / 16,
        x1 / 16, y1 / 16, z1 / 16,
        x1 / 16, y1 / 16, z0 / 16,
        x0 / 16, y1 / 16, z0 / 16,
        0, 1, 0,
        uv[0] / 16, uv[1] / 16, uv[2] / 16, uv[3] / 16,
        positions, normals, uvs
      );
    }
  }

  return {positions, normals, uvs, texturePath};
}

function quad(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  dx: number, dy: number, dz: number,
  nx: number, ny: number, nz: number,
  u0: number, v0: number, u1: number, v1: number,
  positions: number[], normals: number[], uvs: number[]
) {
  // 三角形 1: a, b, c
  positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  uvs.push(u0, v0, u1, v0, u1, v1);

  // 三角形 2: a, c, d
  positions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  uvs.push(u0, v0, u1, v1, u0, v1);
}

/**
 * 从 ZIP 资源包中查找物品模型。
 * 路径示例：assets/minecraft/models/item/diamond_sword.json
 */
export async function loadItemFromPack(
  packZip: ArrayBuffer,
  namespace: string,
  itemName: string
): Promise<ItemModel> {
  // 浏览器环境：需要 JSZip 或类似库
  // 这里只提供接口，实际加载由调用方实现
  throw new Error('loadItemFromPack: 需要在实际环境中实现 ZIP 解析');
}
