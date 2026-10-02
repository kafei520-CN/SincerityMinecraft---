import {splitSeed} from './logic';

interface CubiomesModule {
  _cm_apply: (mc: number, dim: number, lo: number, hi: number) => number;
  _cm_biomes: (x: number, z: number, sx: number, sz: number, scale: number, out: number) => number;
  _cm_biome_name: (id: number) => number;
  _cm_structures: (
    structure: number,
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    out: number,
    cap: number,
  ) => number;
  _cm_strongholds: (minX: number, minZ: number, maxX: number, maxZ: number, out: number, cap: number) => number;
  _malloc: (bytes: number) => number;
  _free: (pointer: number) => void;
  HEAP32: Int32Array;
  UTF8ToString: (pointer: number) => string;
}

type CreateCubiomes = () => Promise<CubiomesModule>;

let modulePromise: Promise<CubiomesModule> | undefined;

/** 加载编译好的 cubiomes。 */
export function loadCubiomes(): Promise<CubiomesModule> {
  modulePromise ??= (new Function('return import("/cubiomes/cubiomes.js")')() as Promise<{default: CreateCubiomes}>)
    .then((mod) => mod.default());
  return modulePromise;
}

export interface MapSample {
  biomes: Int32Array;
  width: number;
  height: number;
  originX: number;
  originZ: number;
  scale: number;
}

export interface StructureMark {
  name: string;
  x: number;
  z: number;
  viable: boolean;
}

/** 用 cubiomes 生成当前视野的生物群系。 */
export function sampleBiomes(
  engine: CubiomesModule,
  mc: number,
  dim: number,
  seed: bigint,
  originX: number,
  originZ: number,
  width: number,
  height: number,
  scale: number,
): MapSample {
  const parts = splitSeed(seed);
  engine._cm_apply(mc, dim, parts.lo, parts.hi);
  const pointer = engine._malloc(width * height * 4);
  const status = engine._cm_biomes(originX, originZ, width, height, scale, pointer);
  const biomes = new Int32Array(engine.HEAP32.buffer, pointer >> 2, width * height).slice();
  engine._free(pointer);
  if (status !== 0) {
    throw new Error('这个版本生成地图失败');
  }
  return {biomes, width, height, originX, originZ, scale};
}

export function biomeName(engine: CubiomesModule, id: number): string {
  return engine.UTF8ToString(engine._cm_biome_name(id));
}

/** 收集视野里的结构点。viable 为 0 表示地形或群系不允许它真正生成。 */
export function sampleStructures(
  engine: CubiomesModule,
  structures: {id: number; name: string}[],
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  includeStrongholds: boolean,
): StructureMark[] {
  const marks: StructureMark[] = [];
  const cap = 400;
  const pointer = engine._malloc(cap * 3 * 4);
  for (const structure of structures) {
    const count = engine._cm_structures(structure.id, minX, minZ, maxX, maxZ, pointer, cap);
    const values = new Int32Array(engine.HEAP32.buffer, pointer >> 2, count * 3);
    for (let index = 0; index < count; index++) {
      marks.push({
        name: structure.name,
        x: values[index * 3] ?? 0,
        z: values[index * 3 + 1] ?? 0,
        viable: (values[index * 3 + 2] ?? 0) !== 0,
      });
    }
  }
  if (includeStrongholds) {
    const count = engine._cm_strongholds(minX, minZ, maxX, maxZ, pointer, cap);
    const values = new Int32Array(engine.HEAP32.buffer, pointer >> 2, count * 2);
    for (let index = 0; index < count; index++) {
      marks.push({
        name: '要塞',
        x: values[index * 2] ?? 0,
        z: values[index * 2 + 1] ?? 0,
        viable: true,
      });
    }
  }
  engine._free(pointer);
  return marks;
}
