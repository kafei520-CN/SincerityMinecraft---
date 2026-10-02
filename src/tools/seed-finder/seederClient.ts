/**
 * 调用 Seeder 预编译的 cubiomes worker。
 * 引擎来自 https://github.com/TrinTragula/seeder （MIT），
 * 世界生成来自 xpple/cubiomes。
 */

type Reply = {
  kind: string;
  data?: {
    error?: {message?: string} | null;
    rgba?: Uint8ClampedArray;
    ids?: Int32Array;
    x?: number;
    z?: number;
    coords?: number[][];
    cells?: Uint8Array;
    cx0?: number;
    cz0?: number;
    w?: number;
    h?: number;
  };
};

type Area = {
  rgba: Uint8ClampedArray;
  ids: Int32Array;
  startX: number;
  startZ: number;
  width: number;
  height: number;
};

type Point = {x: number; z: number};

type Lane = {
  call<T>(kind: string, data: Record<string, unknown>): Promise<T>;
};

/** 每条通道一个 worker，通道内部串行。地图块并行，结构查询单独一条，避免互相堵住。 */
function createLane(): Lane {
  let workerPromise: Promise<Worker> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function bootWorker(): Promise<Worker> {
    workerPromise ??= new Promise((resolve, reject) => {
      const worker = new Worker('/seeder/worker.js');
      const fail = (event: ErrorEvent) => {
        workerPromise = undefined;
        reject(new Error(event.message || '种子引擎加载失败'));
      };
      worker.addEventListener('error', fail);
      worker.addEventListener('message', function ready(event: MessageEvent<Reply>) {
        if (event.data?.kind !== 'DONE_LOADING') {
          return;
        }
        worker.removeEventListener('message', ready);
        worker.removeEventListener('error', fail);
        resolve(worker);
      });
      worker.postMessage({kind: 'INIT'});
    });
    return workerPromise;
  }

  function call<T>(kind: string, data: Record<string, unknown>): Promise<T> {
    const run = async () => {
      const worker = await bootWorker();
      return new Promise<T>((resolve, reject) => {
        const finish = () => {
          worker.removeEventListener('message', onMessage);
          worker.removeEventListener('error', onError);
        };
        const onError = (event: ErrorEvent) => {
          finish();
          workerPromise = undefined;
          reject(new Error(event.message || '种子引擎中断'));
        };
        const onMessage = (event: MessageEvent<Reply>) => {
          if (event.data?.kind !== `DONE_${kind}`) {
            return;
          }
          finish();
          const body = event.data.data;
          if (body?.error) {
            reject(new Error(body.error.message || '种子引擎计算失败'));
            return;
          }
          resolve(body as T);
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
        worker.postMessage({kind, data});
      });
    };
    const result = queue.then(run, run);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }

  return {call};
}

const tileLanes = [createLane(), createLane(), createLane(), createLane()];
let tileTurn = 0;
const infoLane = createLane();

function tileCall<T>(kind: string, data: Record<string, unknown>): Promise<T> {
  const lane = tileLanes[tileTurn % tileLanes.length];
  tileTurn += 1;
  if (!lane) {
    return Promise.reject(new Error('种子引擎加载失败'));
  }
  return lane.call<T>(kind, data);
}

/** 按 1:4 的生物群系格取一块彩色地图。startX/startZ 是格子坐标。 */
export function loadArea(
  mcVersion: number,
  seed: string,
  startX: number,
  startZ: number,
  width: number,
  height: number,
  dimension: number,
  yHeight: number,
): Promise<Area> {
  return tileCall<{rgba: Uint8ClampedArray; ids: Int32Array}>('GET_AREA', {
    mcVersion,
    seed,
    startX,
    startY: startZ,
    widthX: width,
    widthY: height,
    dimension,
    yHeight,
  }).then((data) => ({
    rgba: data.rgba,
    ids: data.ids,
    startX,
    startZ,
    width,
    height,
  }));
}

export function loadSpawn(mcVersion: number, seed: string): Promise<Point> {
  return infoLane.call<{x: number; z: number}>('GET_SPAWN', {mcVersion, seed});
}

export function loadStrongholds(mcVersion: number, seed: string): Promise<Point[]> {
  return infoLane.call<{coords: number[][]}>('GET_STRONGHOLDS', {mcVersion, seed, howMany: 128}).then((data) =>
    (data.coords ?? []).map((pair) => ({x: pair[0] ?? 0, z: pair[1] ?? 0})),
  );
}

/** 原点附近若干区域内的结构，坐标是方块。regionsRange 是区域半径。 */
export function loadStructures(
  mcVersion: number,
  structType: number,
  seed: string,
  dimension: number,
  regionsRange = 64,
): Promise<Point[]> {
  return infoLane.call<{coords: number[][]}>('GET_STRUCTURES_IN_REGIONS', {
    mcVersion,
    structType,
    seed,
    regionsRange,
    dimension,
  }).then((data) => (data.coords ?? []).map((pair) => ({x: pair[0] ?? 0, z: pair[1] ?? 0})));
}

export function loadSlimeChunks(
  seed: string,
  cx0: number,
  cz0: number,
  w: number,
  h: number,
): Promise<Uint8Array> {
  return tileCall<{cells: Uint8Array}>('SLIME_CHUNKS', {seed, cx0, cz0, w, h}).then((data) => data.cells);
}
