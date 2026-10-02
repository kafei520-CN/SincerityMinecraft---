import {JAVA_VERSIONS} from './versions';

/** zoom 16 时 1 像素等于 1 个方块。数值越大看得越近，和常见种子地图的 zoom 同一量级。 */
export const BASE_ZOOM = 16;
export const MIN_ZOOM = 11;
export const MAX_ZOOM = 20;

const CELL = 4;

/**
 * 缩小以后加大图块，让一整屏只有几十次请求。
 * 固定 64 格时，zoom 12 的一屏有几百块，缓存装不下就会把中心删掉重画，地图一直闪，而且铺不满。
 */
export function tileCellsForZoom(zoom: number): number {
  if (zoom >= 14.5) {
    return 32;
  }
  if (zoom >= 13) {
    return 64;
  }
  if (zoom >= 12) {
    return 96;
  }
  return 128;
}

export function tileBlocksForZoom(zoom: number): number {
  return tileCellsForZoom(zoom) * CELL;
}

const DIMENSION_NAME: Record<number, string> = {
  0: 'overworld',
  [-1]: 'nether',
  1: 'end',
};

export type MapLink = {
  seed?: string;
  versionName?: string;
  dimension?: number;
  x?: number;
  z?: number;
  zoom?: number;
  y?: number;
  notice?: string;
};

export function blocksPerPixel(zoom: number): number {
  return 2 ** (BASE_ZOOM - zoom);
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return 15;
  }
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function versionByName(name: string): number | undefined {
  return JAVA_VERSIONS.find((entry) => entry.name === name)?.id;
}

function splitPlatform(platform: string): {edition: string; versionName: string} | undefined {
  if (platform.startsWith('large_biomes_')) {
    return {edition: 'large_biomes', versionName: platform.slice('large_biomes_'.length)};
  }
  if (platform.startsWith('bedrock_')) {
    return {edition: 'bedrock', versionName: platform.slice('bedrock_'.length)};
  }
  if (platform.startsWith('java_')) {
    return {edition: 'java', versionName: platform.slice('java_'.length)};
  }
  return undefined;
}

/** 读取 #seed=&platform=java_1.21.1&dimension=overworld&x=&z=&zoom= 这种镜头。 */
export function parseHash(hash: string): MapLink {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const link: MapLink = {};
  const seed = params.get('seed');
  if (seed) {
    link.seed = seed;
  }
  const platform = params.get('platform');
  if (platform) {
    const split = splitPlatform(platform);
    if (split && versionByName(split.versionName) !== undefined) {
      link.versionName = split.versionName;
      if (split.edition === 'bedrock') {
        link.notice = '基岩版的结构位置和 Java 不同。1.18 起这里只保证生物群系。';
      }
      if (split.edition === 'large_biomes') {
        link.notice = '放大生物群系不在这套引擎里，已按普通 Java 显示。';
      }
    }
  }
  const dimension = params.get('dimension');
  if (dimension === 'overworld') {
    link.dimension = 0;
  } else if (dimension === 'nether') {
    link.dimension = -1;
  } else if (dimension === 'end') {
    link.dimension = 1;
  }
  const x = numberParam(params, 'x');
  const z = numberParam(params, 'z');
  const zoom = numberParam(params, 'zoom');
  const y = numberParam(params, 'y');
  if (x !== undefined) {
    link.x = x;
  }
  if (z !== undefined) {
    link.z = z;
  }
  if (zoom !== undefined) {
    link.zoom = clampZoom(zoom);
  }
  if (y !== undefined) {
    link.y = y;
  }
  return link;
}

function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw === '') {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function buildHash(input: {
  seed: string;
  versionName: string;
  dimension: number;
  x: number;
  z: number;
  zoom: number;
  y: number;
}): string {
  const params = new URLSearchParams();
  params.set('seed', input.seed);
  params.set('platform', `java_${input.versionName}`);
  params.set('dimension', DIMENSION_NAME[input.dimension] ?? 'overworld');
  params.set('x', String(Math.round(input.x)));
  params.set('z', String(Math.round(input.z)));
  params.set('zoom', input.zoom.toFixed(3));
  if (input.y !== 320) {
    params.set('y', String(input.y));
  }
  return `#${params.toString()}`;
}

export function sameHash(left: string, right: string): boolean {
  const a = new URLSearchParams(left.startsWith('#') ? left.slice(1) : left);
  const b = new URLSearchParams(right.startsWith('#') ? right.slice(1) : right);
  const keys = ['seed', 'platform', 'dimension', 'x', 'z', 'zoom', 'y'];
  return keys.every((key) => (a.get(key) ?? '') === (b.get(key) ?? ''));
}

export type View = {
  left: number;
  top: number;
  blocksPerPixel: number;
};

export function viewOf(centerX: number, centerZ: number, zoom: number, width: number, height: number): View {
  const scale = blocksPerPixel(zoom);
  return {
    left: centerX - (width / 2) * scale,
    top: centerZ - (height / 2) * scale,
    blocksPerPixel: scale,
  };
}

export function tileRange(view: View, width: number, height: number, tileBlocks: number): {x0: number; x1: number; z0: number; z1: number} {
  const right = view.left + width * view.blocksPerPixel;
  const bottom = view.top + height * view.blocksPerPixel;
  return {
    x0: Math.floor(view.left / tileBlocks),
    x1: Math.floor(right / tileBlocks),
    z0: Math.floor(view.top / tileBlocks),
    z1: Math.floor(bottom / tileBlocks),
  };
}
