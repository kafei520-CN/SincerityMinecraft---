import {useEffect, useMemo, useRef, useState} from 'react';
import {ModeButton} from '../../components/ModeButton';
import {TextField} from '../../components/TextField';
import {biomeName} from './biomes';
import {SLIME_ICON, SPAWN_ICON, STRONGHOLD_ICON, markerImage, structureIcon, wikiUrl} from './icons';
import {
  blocksPerPixel,
  buildHash,
  clampZoom,
  parseHash,
  sameHash,
  tileCellsForZoom,
  tileRange,
  versionByName,
  viewOf,
  type View,
} from './camera';
import {formatSeed, parseJavaSeed} from './logic';
import {loadArea, loadSlimeChunks, loadSpawn, loadStrongholds, loadStructures} from './seederClient';
import {DIMENSIONS, HEIGHTS, JAVA_VERSIONS, STRUCTURES} from './versions';

type Tile = {canvas: HTMLCanvasElement; ids: Int32Array; tx: number; tz: number; cells: number};
type Mark = {name: string; x: number; z: number; minZoom: number; icon: string; wiki: string};
type Detail = {name: string; x: number; z: number; biome: string; wiki: string; icon: string};
type Slime = {cells: Uint8Array; cx0: number; cz0: number; w: number; h: number};
type Camera = {x: number; z: number; zoom: number};

const STRONGHOLD_ZOOM = 12.1;

function tileImage(rgba: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const pixels = new Uint8ClampedArray(rgba);
  canvas.getContext('2d')?.putImageData(new ImageData(pixels as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  return canvas;
}

function IconToggle({pressed, title, src, onClick}: {pressed: boolean; title: string; src: string; onClick: () => void}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid size-11 place-items-center rounded-2xl border bg-white ${pressed ? 'border-ink ring-2 ring-ink' : 'border-line'}`}
    >
      <img src={src} alt="" className="size-6 [image-rendering:pixelated]" />
    </button>
  );
}

/** 分块种子地图。镜头写在地址 #seed=&platform=&dimension=&x=&z=&zoom= 里。 */
export default function SeedFinderWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useRef<Camera>({x: 0, z: 0, zoom: 15});
  const tiles = useRef(new Map<string, Tile>());
  const inflight = useRef(new Set<string>());
  const retries = useRef(new Map<string, number>());
  const marks = useRef<Mark[]>([]);
  const slime = useRef<Slime | undefined>(undefined);
  const slimeKey = useRef('');
  const slimeBusy = useRef(false);
  const markWorld = useRef('');
  const doneSet = useRef(new Set<string>());
  const followSpawn = useRef(true);
  const pointCache = useRef(new Map<string, {range: number; marks: Mark[]}>());
  const loadingMarks = useRef(new Set<string>());
  const frame = useRef(0);
  const suppressHash = useRef(true);
  const ownHash = useRef('');
  const drag = useRef<{x: number; z: number; px: number; py: number; moved: boolean} | undefined>(undefined);
  const dragged = useRef(false);
  const paintRef = useRef<() => void>(() => undefined);
  const pokeRef = useRef<() => void>(() => undefined);

  const [seedText, setSeedText] = useState('404');
  const [seed, setSeed] = useState('404');
  const [version, setVersion] = useState(35);
  const [dimension, setDimension] = useState(0);
  const [height, setHeight] = useState(320);
  const [enabled, setEnabled] = useState<number[]>([5, 7, 8, 9, 12, 14, 16, 17, 18, 19, 21]);
  const [showSpawn, setShowSpawn] = useState(true);
  const [showStrongholds, setShowStrongholds] = useState(true);
  const [showSlime, setShowSlime] = useState(false);
  const [hover, setHover] = useState('把指针移到地图上');
  const [readout, setReadout] = useState('0, 0 · 15.000');
  const [status, setStatus] = useState('正在加载 Seeder 引擎');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState('');
  const [detail, setDetail] = useState<Detail | undefined>(undefined);
  const [doneKeys, setDoneKeys] = useState<string[]>([]);
  const [structureRange, setStructureRange] = useState(16);
  const [jumpX, setJumpX] = useState('');
  const [jumpZ, setJumpZ] = useState('');

  const versionName = JAVA_VERSIONS.find((entry) => entry.id === version)?.name ?? '26.3';
  const modern = version >= 22;
  const sampleY = modern ? height : 62;
  const choices = useMemo(() => STRUCTURES.filter((entry) => entry.dim === dimension), [dimension]);
  const world = `${version}|${seed}|${dimension}|${sampleY}`;
  const settings = useRef({version, seed, dimension, sampleY, showSlime, versionName, world});
  settings.current = {version, seed, dimension, sampleY, showSlime, versionName, world};
  const viewToggles = useRef({showSpawn, showStrongholds, enabled, structureRange});
  viewToggles.current = {showSpawn, showStrongholds, enabled, structureRange};

  pokeRef.current = () => {
    if (frame.current !== 0) {
      return;
    }
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      paintRef.current();
    });
  };

  paintRef.current = () => {
    const canvas = canvasRef.current;
    const current = settings.current;
    if (!canvas) {
      return;
    }
    const width = Math.max(1, Math.round(canvas.clientWidth));
    const heightPx = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== width || canvas.height !== heightPx) {
      canvas.width = width;
      canvas.height = heightPx;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const shot = camera.current;
    const view = viewOf(shot.x, shot.z, shot.zoom, width, heightPx);
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#f4f4f4';
    context.fillRect(0, 0, width, heightPx);
    const cells = tileCellsForZoom(shot.zoom);
    const tileBlocks = cells * 4;
    const range = tileRange(view, width, heightPx, tileBlocks);
    const missing: {tx: number; tz: number; distance: number}[] = [];
    const centerTx = Math.floor(shot.x / tileBlocks);
    const centerTz = Math.floor(shot.z / tileBlocks);
    for (let tz = range.z0; tz <= range.z1; tz += 1) {
      for (let tx = range.x0; tx <= range.x1; tx += 1) {
        const key = `${current.world}|${cells}|${tx}|${tz}`;
        const tile = tiles.current.get(key);
        if (!tile) {
          missing.push({tx, tz, distance: (tx - centerTx) ** 2 + (tz - centerTz) ** 2});
          continue;
        }
        const x0 = Math.round((tx * tileBlocks - view.left) / view.blocksPerPixel);
        const y0 = Math.round((tz * tileBlocks - view.top) / view.blocksPerPixel);
        const x1 = Math.round(((tx + 1) * tileBlocks - view.left) / view.blocksPerPixel);
        const y1 = Math.round(((tz + 1) * tileBlocks - view.top) / view.blocksPerPixel);
        context.drawImage(tile.canvas, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
      }
    }
    paintSlime(context, view, width, heightPx);
    paintMarks(context, view, width, heightPx, shot.zoom);
    const label = `${Math.round(shot.x)}, ${Math.round(shot.z)} · ${shot.zoom.toFixed(3)}`;
    setReadout((previous) => previous === label ? previous : label);
    scheduleTiles(missing, current, cells);
  };

  function paintSlime(context: CanvasRenderingContext2D, view: View, width: number, heightPx: number) {
    const current = settings.current;
    if (!current.showSlime || current.dimension !== 0 || camera.current.zoom < 13) {
      return;
    }
    const right = view.left + width * view.blocksPerPixel;
    const bottom = view.top + heightPx * view.blocksPerPixel;
    const cx0 = Math.floor(view.left / 16);
    const cz0 = Math.floor(view.top / 16);
    const spanX = Math.floor(right / 16) - cx0 + 1;
    const spanZ = Math.floor(bottom / 16) - cz0 + 1;
    const chunkW = Math.min(64, Math.max(1, spanX));
    const chunkH = Math.min(64, Math.max(1, spanZ));
    const originX = spanX > 64 ? cx0 + Math.floor((spanX - 64) / 2) : cx0;
    const originZ = spanZ > 64 ? cz0 + Math.floor((spanZ - 64) / 2) : cz0;
    const key = `${current.seed}:${originX}:${originZ}:${chunkW}:${chunkH}`;
    const grid = slime.current;
    if (grid && slimeKey.current === key) {
      context.fillStyle = 'rgba(64, 196, 48, 0.45)';
      for (let dz = 0; dz < grid.h; dz += 1) {
        for (let dx = 0; dx < grid.w; dx += 1) {
          if (grid.cells[dz * grid.w + dx] !== 1) {
            continue;
          }
          const x0 = Math.round(((grid.cx0 + dx) * 16 - view.left) / view.blocksPerPixel);
          const y0 = Math.round(((grid.cz0 + dz) * 16 - view.top) / view.blocksPerPixel);
          const x1 = Math.round(((grid.cx0 + dx + 1) * 16 - view.left) / view.blocksPerPixel);
          const y1 = Math.round(((grid.cz0 + dz + 1) * 16 - view.top) / view.blocksPerPixel);
          context.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
        }
      }
    }
    if (slimeKey.current === key || slimeBusy.current) {
      return;
    }
    slimeBusy.current = true;
    const worldAt = current.world;
    void loadSlimeChunks(current.seed, originX, originZ, chunkW, chunkH)
      .then((cells) => {
        slimeBusy.current = false;
        if (settings.current.world !== worldAt) {
          return;
        }
        slime.current = {cells, cx0: originX, cz0: originZ, w: chunkW, h: chunkH};
        slimeKey.current = key;
        pokeRef.current();
      })
      .catch(() => {
        slimeBusy.current = false;
      });
  }

  function paintMarks(context: CanvasRenderingContext2D, view: View, width: number, heightPx: number, zoom: number) {
    const right = view.left + width * view.blocksPerPixel;
    const bottom = view.top + heightPx * view.blocksPerPixel;
    const centerX = view.left + (width * view.blocksPerPixel) / 2;
    const centerZ = view.top + (heightPx * view.blocksPerPixel) / 2;
    const visible = marks.current
      .filter((mark) => mark.x >= view.left && mark.x <= right && mark.z >= view.top && mark.z <= bottom)
      .map((mark) => ({
        mark,
        px: (mark.x - view.left) / view.blocksPerPixel,
        py: (mark.z - view.top) / view.blocksPerPixel,
        distance: (mark.x - centerX) ** 2 + (mark.z - centerZ) ** 2,
      }))
      .sort((left, rightMark) => left.distance - rightMark.distance);
    const size = zoom >= 14 ? 20 : 16;
    for (const item of [...visible].reverse()) {
      const done = doneSet.current.has(`${settings.current.seed}|${item.mark.name}|${item.mark.x}|${item.mark.z}`);
      context.globalAlpha = done ? 0.35 : 1;
      const image = markerImage(item.mark.icon, () => pokeRef.current());
      if (image) {
        context.drawImage(image, item.px - size / 2, item.py - size / 2, size, size);
      } else {
        context.beginPath();
        context.arc(item.px, item.py, 4, 0, Math.PI * 2);
        context.fillStyle = '#111111';
        context.fill();
      }
      context.globalAlpha = 1;
    }
  }

  function markerAt(offsetX: number, offsetY: number): Mark | undefined {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const view = viewOf(camera.current.x, camera.current.z, camera.current.zoom, canvas.width, canvas.height);
    const size = camera.current.zoom >= 14 ? 14 : 12;
    let best: {mark: Mark; distance: number} | undefined;
    for (const mark of marks.current) {
      const px = (mark.x - view.left) / view.blocksPerPixel;
      const py = (mark.z - view.top) / view.blocksPerPixel;
      const distance = Math.hypot(px - offsetX, py - offsetY);
      if (distance <= size && (!best || distance < best.distance)) {
        best = {mark, distance};
      }
    }
    return best?.mark;
  }

  function evictOffscreen(world: string, cells: number) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const shot = camera.current;
    const tileBlocks = cells * 4;
    const view = viewOf(shot.x, shot.z, shot.zoom, canvas.width, canvas.height);
    const range = tileRange(view, canvas.width, canvas.height, tileBlocks);
    while (tiles.current.size > 360) {
      let victim: string | undefined;
      let worst = -1;
      for (const [key, tile] of tiles.current) {
        const onScreen = tile.cells === cells
          && tile.tx >= range.x0 && tile.tx <= range.x1
          && tile.tz >= range.z0 && tile.tz <= range.z1
          && key.startsWith(`${world}|`);
        if (onScreen) {
          continue;
        }
        const distance = (tile.tx - range.x0) ** 2 + (tile.tz - range.z0) ** 2;
        if (distance > worst) {
          worst = distance;
          victim = key;
        }
      }
      if (victim === undefined) {
        break;
      }
      tiles.current.delete(victim);
    }
  }

  function scheduleTiles(
    missing: {tx: number; tz: number; distance: number}[],
    current: {version: number; seed: string; dimension: number; sampleY: number; world: string; versionName: string},
    cells: number,
  ) {
    missing.sort((left, right) => left.distance - right.distance);
    let started = 0;
    for (const tile of missing) {
      if (inflight.current.size >= 8 || started >= 6) {
        break;
      }
      const key = `${current.world}|${cells}|${tile.tx}|${tile.tz}`;
      if (tiles.current.has(key) || inflight.current.has(key) || (retries.current.get(key) ?? 0) >= 2) {
        continue;
      }
      inflight.current.add(key);
      started += 1;
      void loadArea(current.version, current.seed, tile.tx * cells, tile.tz * cells, cells, cells, current.dimension, current.sampleY)
        .then((area) => {
          inflight.current.delete(key);
          if (settings.current.world !== current.world || tileCellsForZoom(camera.current.zoom) !== cells) {
            return;
          }
          tiles.current.set(key, {
            canvas: tileImage(area.rgba, area.width, area.height),
            ids: area.ids,
            tx: tile.tx,
            tz: tile.tz,
            cells,
          });
          evictOffscreen(current.world, cells);
          setStatus(`种子 ${current.seed} · ${current.versionName}`);
          pokeRef.current();
        })
        .catch((caught: unknown) => {
          inflight.current.delete(key);
          retries.current.set(key, (retries.current.get(key) ?? 0) + 1);
          if ((retries.current.get(key) ?? 0) >= 2) {
            setStatus(caught instanceof Error ? caught.message : '地图生成失败');
          }
          pokeRef.current();
        });
    }
  }

  function zoomAt(nextZoom: number, offsetX: number, offsetY: number) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const view = viewOf(camera.current.x, camera.current.z, camera.current.zoom, canvas.width, canvas.height);
    const blockX = view.left + offsetX * view.blocksPerPixel;
    const blockZ = view.top + offsetY * view.blocksPerPixel;
    const zoom = clampZoom(nextZoom);
    const scale = viewOf(0, 0, zoom, 1, 1).blocksPerPixel;
    camera.current = {
      zoom,
      x: blockX - (offsetX - canvas.width / 2) * scale,
      z: blockZ - (offsetY - canvas.height / 2) * scale,
    };
    pokeRef.current();
  }

  function blockAt(offsetX: number, offsetY: number) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return {blockX: 0, blockZ: 0, name: ''};
    }
    const view = viewOf(camera.current.x, camera.current.z, camera.current.zoom, canvas.width, canvas.height);
    const blockX = Math.floor(view.left + offsetX * view.blocksPerPixel);
    const blockZ = Math.floor(view.top + offsetY * view.blocksPerPixel);
    const cells = tileCellsForZoom(camera.current.zoom);
    const tx = Math.floor(blockX / (cells * 4));
    const tz = Math.floor(blockZ / (cells * 4));
    const tile = tiles.current.get(`${settings.current.world}|${cells}|${tx}|${tz}`);
    let name = '';
    if (tile) {
      const localX = Math.floor(blockX / 4) - tx * cells;
      const localZ = Math.floor(blockZ / 4) - tz * cells;
      const id = tile.ids[localZ * tile.canvas.width + localX];
      if (localX >= 0 && localZ >= 0 && localX < tile.canvas.width && localZ < tile.canvas.height && id !== undefined) {
        name = biomeName(id);
      }
    }
    return {blockX, blockZ, name};
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('sincerity-seed-done');
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        setDoneKeys(parsed);
        doneSet.current = new Set(parsed);
      }
    } catch {
      setDoneKeys([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSeed(formatSeed(parseJavaSeed(seedText))), 250);
    return () => window.clearTimeout(timer);
  }, [seedText]);

  useEffect(() => {
    tiles.current.clear();
    retries.current.clear();
    slime.current = undefined;
    slimeKey.current = '';
    setStatus('正在绘制地图');
    pokeRef.current();
  }, [world]);

  function showCachedMarks() {
    const current = settings.current;
    const toggles = viewToggles.current;
    const token = `${current.version}|${current.seed}|${current.dimension}`;
    const list: Mark[] = [];
    const spawn = pointCache.current.get(`${token}|spawn`);
    if (toggles.showSpawn && current.dimension === 0 && spawn) {
      list.push(...spawn.marks);
    }
    for (const structure of STRUCTURES) {
      if (structure.dim !== current.dimension || !toggles.enabled.includes(structure.id)) {
        continue;
      }
      const pack = pointCache.current.get(`${token}|${structure.id}`);
      if (pack) {
        list.push(...pack.marks);
      }
    }
    const strongholds = pointCache.current.get(`${token}|stronghold`);
    if (toggles.showStrongholds && current.dimension === 0 && strongholds) {
      list.push(...strongholds.marks);
    }
    marks.current = list;
    pokeRef.current();
  }

  useEffect(() => {
    const token = `${version}|${seed}|${dimension}`;
    if (markWorld.current !== token) {
      pointCache.current.clear();
      loadingMarks.current.clear();
      marks.current = [];
      markWorld.current = token;
    }
    const ensure = (key: string, range: number, run: () => Promise<Mark[]>) => {
      const pack = pointCache.current.get(key);
      if (pack && pack.range >= range) {
        return;
      }
      const flight = `${key}@${range}`;
      if (loadingMarks.current.has(flight)) {
        return;
      }
      loadingMarks.current.add(flight);
      void run()
        .then((found) => {
          loadingMarks.current.delete(flight);
          if (markWorld.current !== token) {
            return;
          }
          const existing = pointCache.current.get(key);
          if (!existing || existing.range <= range) {
            pointCache.current.set(key, {range, marks: found});
          }
          showCachedMarks();
        })
        .catch((caught: unknown) => {
          loadingMarks.current.delete(flight);
          if (markWorld.current === token) {
            setStatus(caught instanceof Error ? caught.message : '结构计算失败');
          }
        });
    };
    if (followSpawn.current || (showSpawn && dimension === 0)) {
      ensure(`${token}|spawn`, 0, async () => {
        const spawn = await loadSpawn(version, seed);
        if (followSpawn.current && markWorld.current === token) {
          camera.current.x = spawn.x;
          camera.current.z = spawn.z;
          followSpawn.current = false;
          if (dimension !== 0) {
            setDimension(0);
          }
          pokeRef.current();
        }
        return [{name: '出生点', x: spawn.x, z: spawn.z, minZoom: 0, icon: SPAWN_ICON.src, wiki: SPAWN_ICON.wiki}];
      });
    }
    for (const structure of STRUCTURES) {
      if (structure.dim !== dimension || !enabled.includes(structure.id)) {
        continue;
      }
      const icon = structureIcon(structure.id);
      ensure(`${token}|${structure.id}`, structureRange, async () => {
        const points = await loadStructures(version, structure.id, seed, dimension, structureRange);
        return points.map((point) => ({name: structure.name, x: point.x, z: point.z, minZoom: structure.minZoom, icon: icon.src, wiki: icon.wiki}));
      });
    }
    if (showStrongholds && dimension === 0) {
      ensure(`${token}|stronghold`, 0, async () => {
        const points = await loadStrongholds(version, seed);
        return points.map((point) => ({name: '要塞', x: point.x, z: point.z, minZoom: STRONGHOLD_ZOOM, icon: STRONGHOLD_ICON.src, wiki: STRONGHOLD_ICON.wiki}));
      });
    }
    showCachedMarks();
  }, [seed, version, dimension, enabled, showSpawn, showStrongholds, structureRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const canvas = canvasRef.current;
      const width = canvas?.clientWidth ?? 900;
      const heightPx = canvas?.clientHeight ?? 560;
      const scale = blocksPerPixel(camera.current.zoom);
      const reach = Math.max(Math.abs(camera.current.x), Math.abs(camera.current.z)) + (Math.max(width, heightPx) * scale) / 2;
      const range = Math.min(40, Math.max(12, Math.ceil(reach / 512) + 2));
      setStructureRange((current) => current >= range ? current : range);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [readout, seed, version, dimension]);

  useEffect(() => {
    const link = parseHash(window.location.hash);
    if (link.seed) {
      setSeedText(link.seed);
      setSeed(formatSeed(parseJavaSeed(link.seed)));
    }
    const versionId = link.versionName ? versionByName(link.versionName) : undefined;
    if (versionId !== undefined) {
      setVersion(versionId);
    }
    if (link.dimension !== undefined) {
      setDimension(link.dimension);
    }
    if (link.y !== undefined) {
      setHeight(link.y);
    }
    if (link.x !== undefined || link.z !== undefined) {
      followSpawn.current = false;
    }
    if (link.x !== undefined) {
      camera.current.x = link.x;
    }
    if (link.z !== undefined) {
      camera.current.z = link.z;
    }
    if (link.zoom !== undefined) {
      camera.current.zoom = link.zoom;
    }
    setNotice(link.notice ?? '');
    pokeRef.current();

    const onHash = () => {
      if (sameHash(window.location.hash, ownHash.current)) {
        return;
      }
      const next = parseHash(window.location.hash);
      if (next.seed) {
        setSeedText(next.seed);
        setSeed(formatSeed(parseJavaSeed(next.seed)));
      }
      const nextVersion = next.versionName ? versionByName(next.versionName) : undefined;
      if (nextVersion !== undefined) {
        setVersion(nextVersion);
      }
      if (next.dimension !== undefined) {
        setDimension(next.dimension);
      }
      if (next.y !== undefined) {
        setHeight(next.y);
      }
      if (next.x !== undefined || next.z !== undefined) {
        followSpawn.current = false;
      }
      if (next.x !== undefined) {
        camera.current.x = next.x;
      }
      if (next.z !== undefined) {
        camera.current.z = next.z;
      }
      if (next.zoom !== undefined) {
        camera.current.zoom = next.zoom;
      }
      setNotice(next.notice ?? '');
      pokeRef.current();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (suppressHash.current) {
      suppressHash.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => {
      if (followSpawn.current) {
        return;
      }
      const next = buildHash({
        seed,
        versionName,
        dimension,
        x: camera.current.x,
        z: camera.current.z,
        zoom: camera.current.zoom,
        y: sampleY,
      });
      ownHash.current = next;
      if (!sameHash(window.location.hash, next)) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${next}`);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [seed, versionName, dimension, sampleY, readout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const zoom = (event: WheelEvent) => {
      event.preventDefault();
      const step = Math.max(-0.8, Math.min(0.8, event.deltaY * 0.002));
      const rect = canvas.getBoundingClientRect();
      zoomAt(camera.current.zoom - step, event.clientX - rect.left, event.clientY - rect.top);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      const view = viewOf(camera.current.x, camera.current.z, camera.current.zoom, canvas.clientWidth, canvas.clientHeight);
      const step = view.blocksPerPixel * 80;
      if (event.key === 'ArrowLeft') {
        camera.current.x -= step;
      } else if (event.key === 'ArrowRight') {
        camera.current.x += step;
      } else if (event.key === 'ArrowUp') {
        camera.current.z -= step;
      } else if (event.key === 'ArrowDown') {
        camera.current.z += step;
      } else if (event.key === '+' || event.key === '=') {
        zoomAt(camera.current.zoom + 0.5, canvas.clientWidth / 2, canvas.clientHeight / 2);
        return;
      } else if (event.key === '-' || event.key === '_') {
        zoomAt(camera.current.zoom - 0.5, canvas.clientWidth / 2, canvas.clientHeight / 2);
        return;
      } else {
        return;
      }
      event.preventDefault();
      pokeRef.current();
    };
    canvas.addEventListener('wheel', zoom, {passive: false});
    window.addEventListener('keydown', onKey);
    const observer = new ResizeObserver(() => pokeRef.current());
    observer.observe(canvas);
    pokeRef.current();
    return () => {
      canvas.removeEventListener('wheel', zoom);
      window.removeEventListener('keydown', onKey);
      observer.disconnect();
    };
  }, []);

  function jumpToCoordinates() {
    const x = Number(jumpX);
    const z = Number(jumpZ);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      return;
    }
    followSpawn.current = false;
    camera.current.x = Math.round(x);
    camera.current.z = Math.round(z);
    pokeRef.current();
  }

  function toggle(id: number) {
    setEnabled((currentIds) => currentIds.includes(id)
      ? currentIds.filter((item) => item !== id)
      : [...currentIds, id]);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="种子" value={seedText} onChange={(value) => {
          followSpawn.current = true;
          setSeedText(value);
        }} placeholder="数字或文字" />
        <label className="block">
          <span className="mb-2 block text-sm text-mute">版本</span>
          <select
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none focus:border-ink"
            value={version}
            onChange={(event) => {
              followSpawn.current = true;
              setVersion(Number(event.target.value));
            }}
          >
            {JAVA_VERSIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {DIMENSIONS.map((entry) => (
          <ModeButton key={entry.id} pressed={dimension === entry.id} onClick={() => setDimension(entry.id)}>
            {entry.name}
          </ModeButton>
        ))}
        <label className="flex items-center gap-2 text-sm text-mute">
          X
          <input
            value={jumpX}
            inputMode="numeric"
            className="w-24 rounded-2xl border border-line bg-white px-3 py-2 text-ink outline-none focus:border-ink"
            onChange={(event) => setJumpX(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                jumpToCoordinates();
              }
            }}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-mute">
          Z
          <input
            value={jumpZ}
            inputMode="numeric"
            className="w-24 rounded-2xl border border-line bg-white px-3 py-2 text-ink outline-none focus:border-ink"
            onChange={(event) => setJumpZ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                jumpToCoordinates();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink"
          onClick={jumpToCoordinates}
        >
          跳转
        </button>
        {modern && HEIGHTS.map((entry) => (
          <ModeButton key={entry.id} pressed={height === entry.id} onClick={() => setHeight(entry.id)}>
            {entry.name}
          </ModeButton>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {dimension === 0 && (
          <IconToggle pressed={showSpawn} title="出生点" src={SPAWN_ICON.src} onClick={() => setShowSpawn((value) => !value)} />
        )}
        {dimension === 0 && (
          <IconToggle pressed={showStrongholds} title="要塞" src={STRONGHOLD_ICON.src} onClick={() => setShowStrongholds((value) => !value)} />
        )}
        {dimension === 0 && (
          <IconToggle pressed={showSlime} title="史莱姆" src={SLIME_ICON.src} onClick={() => setShowSlime((value) => !value)} />
        )}
        {choices.map((entry) => (
          <IconToggle
            key={entry.id}
            pressed={enabled.includes(entry.id)}
            title={entry.name}
            src={structureIcon(entry.id).src}
            onClick={() => toggle(entry.id)}
          />
        ))}
      </div>
      <p className="text-sm text-mute">{status} · {readout} · {hover}{copied === '' ? '' : ` · 已复制 ${copied}`}</p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="h-[560px] w-full cursor-grab touch-none rounded-3xl bg-paper"
          onPointerDown={(event) => {
            drag.current = {x: camera.current.x, z: camera.current.z, px: event.clientX, py: event.clientY, moved: false};
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const described = blockAt(event.clientX - rect.left, event.clientY - rect.top);
            const hit = markerAt(event.clientX - rect.left, event.clientY - rect.top);
            const place = described.name === '' ? `${described.blockX}, ${described.blockZ}` : `${described.blockX}, ${described.blockZ} · ${described.name}`;
            setHover(hit ? `${hit.name} · ${place}` : place);
            if (!drag.current) {
              return;
            }
            if (Math.hypot(event.clientX - drag.current.px, event.clientY - drag.current.py) > 4) {
              drag.current.moved = true;
            }
            const scale = viewOf(0, 0, camera.current.zoom, 1, 1).blocksPerPixel;
            camera.current.x = drag.current.x - (event.clientX - drag.current.px) * scale;
            camera.current.z = drag.current.z - (event.clientY - drag.current.py) * scale;
            pokeRef.current();
          }}
          onPointerUp={() => {
            dragged.current = drag.current?.moved ?? false;
            drag.current = undefined;
          }}
          onDoubleClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            zoomAt(camera.current.zoom + 1, event.clientX - rect.left, event.clientY - rect.top);
          }}
          onClick={(event) => {
            if (dragged.current) {
              return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            const offsetX = event.clientX - rect.left;
            const offsetY = event.clientY - rect.top;
            const described = blockAt(offsetX, offsetY);
            const hit = markerAt(offsetX, offsetY);
            if (hit) {
              setDetail({name: hit.name, x: hit.x, z: hit.z, biome: described.name, wiki: hit.wiki, icon: hit.icon});
              return;
            }
            setDetail({
              name: described.name || '这个位置',
              x: described.blockX,
              z: described.blockZ,
              biome: described.name,
              wiki: described.name,
              icon: '',
            });
          }}
        />
        {detail && (
          <div className="absolute top-16 left-1/2 z-10 w-72 -translate-x-1/2 rounded-3xl border border-line bg-white p-4">
            <button type="button" className="absolute top-3 right-3 text-mute" onClick={() => setDetail(undefined)} aria-label="关闭">×</button>
            {detail.biome !== '' && <p className="text-sm text-mute">{detail.biome}</p>}
            <div className="mt-2 flex items-center gap-2">
              {detail.icon !== '' && <img src={detail.icon} alt="" className="size-8 [image-rendering:pixelated]" />}
              <p className="text-lg font-semibold">{detail.name}</p>
            </div>
            <p className="mt-3 font-mono text-sm">X {detail.x} &nbsp; Z {detail.z}</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-line px-3 py-1 text-sm"
              onClick={() => {
                const command = `/tp @s ${detail.x} ~ ${detail.z}`;
                setCopied(command);
                void navigator.clipboard?.writeText(command).catch(() => undefined);
              }}
            >
              复制传送指令
            </button>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {detail.wiki !== detail.biome && (
                <a className="underline" href={wikiUrl(detail.wiki)} target="_blank" rel="noreferrer">结构百科</a>
              )}
              {detail.biome !== '' && (
                <a className="underline" href={wikiUrl(detail.biome)} target="_blank" rel="noreferrer">群系百科</a>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doneKeys.includes(`${seed}|${detail.name}|${detail.x}|${detail.z}`)}
                onChange={() => {
                  const id = `${seed}|${detail.name}|${detail.x}|${detail.z}`;
                  setDoneKeys((current) => {
                    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
                    doneSet.current = new Set(next);
                    window.localStorage.setItem('sincerity-seed-done', JSON.stringify(next));
                    pokeRef.current();
                    return next;
                  });
                }}
              />
              标记为已完成
            </label>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <button type="button" className="rounded-full border border-line bg-white px-3 py-1 text-sm" onClick={() => zoomAt(camera.current.zoom + 0.5, (canvasRef.current?.clientWidth ?? 0) / 2, (canvasRef.current?.clientHeight ?? 0) / 2)}>+</button>
          <button type="button" className="rounded-full border border-line bg-white px-3 py-1 text-sm" onClick={() => zoomAt(camera.current.zoom - 0.5, (canvasRef.current?.clientWidth ?? 0) / 2, (canvasRef.current?.clientHeight ?? 0) / 2)}>−</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-mute">
        <span>拖动平移，滚轮缩放，双击放大。点图标看坐标和百科。</span>
        <button
          type="button"
          className="rounded-full border border-line bg-white px-3 py-1 text-ink"
          onClick={() => {
            setCopied('链接');
            void navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
          }}
        >
          复制链接
        </button>
      </div>
      <p className="text-sm text-mute">
        1.18 起生物群系图也适用于基岩版。结构、要塞和史莱姆区块只对 Java 准确，而且只覆盖原点附近。放大生物群系和矿石层不在这套引擎里。
        {notice === '' ? '' : ` ${notice}`}
      </p>
    </div>
  );
}
