import * as THREE from 'three';
import {FACE_ORDER} from './boxUv';
import {makeId} from './id';

export interface TracerTexture {
  uuid: string;
  name: string;
  canvas: HTMLCanvasElement;
  img: HTMLCanvasElement;
  source: string;
  material: THREE.Material;
  render_mode: string;
  pbr_channel: string;
  getGroup?: () => undefined;
}

export interface TraceElement {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  visibility: boolean;
  faces: Record<string, {texture: TracerTexture; getTexture: () => TracerTexture}>;
}

type Listener = () => void;

interface HostGlobals {
  Cube: new () => TraceElement;
  Mesh: new () => TraceElement;
  Texture: {all: TracerTexture[]; getDefault: () => TracerTexture | null};
  Canvas: {scene: THREE.Scene | null; face_order: string[]};
  Outliner: {elements: TraceElement[]};
  Preview: {selected: {camera: THREE.Camera; controls: {target: THREE.Vector3}; isOrtho: boolean} | null};
  Project: {name: string};
  Format: {render_sides: string};
  settings: {render_sides: {value: string}};
  Blockbench: {
    addCSS: (css: string) => {delete: () => void};
    on: (event: string, fn: Listener) => void;
    removeListener: (event: string, fn: Listener) => void;
    dispatch: (event: string) => void;
    showQuickMessage: (text: string) => void;
    export: (options: {content?: string; name?: string}) => void;
  };
  BBPlugin: {register: (id: string, def: {onload?: () => void}) => void};
  Action: new (id: string, data: {click?: () => void; name?: string}) => {click?: () => void; delete: () => void};
  MenuBar: {addAction: (action: {click?: () => void}, menu: string) => void};
  Dialog: new (id: string, opts: {title?: string; lines?: HTMLElement[]}) => {
    object: HTMLElement;
    show: () => void;
    hide: () => void;
    delete: () => void;
  };
}

const listeners = new Map<string, Set<Listener>>();
const actions: {click?: () => void}[] = [];
let booted = false;
let saveHandler: ((fallback: string, filename: string) => void) | null = null;

export function setSaveHandler(handler: (fallback: string, filename: string) => void): void {
  saveHandler = handler;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.click();
}

function globals(): HostGlobals {
  return globalThis as unknown as HostGlobals;
}

export function installHost(scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: {target: THREE.Vector3}): void {
  const root = globals();
  class Cube {
    id = '';
    name = '';
    mesh: THREE.Mesh | null = null;
    visibility = true;
    faces: TraceElement['faces'] = {};
  }
  root.Cube = Cube as unknown as HostGlobals['Cube'];
  root.Mesh = class {} as unknown as HostGlobals['Mesh'];
  const textures: TracerTexture[] = root.Texture?.all ?? [];
  root.Texture = {
    all: textures,
    getDefault: () => textures[0] ?? null,
  };
  root.Canvas = {scene, face_order: [...FACE_ORDER]};
  root.Outliner = root.Outliner ?? {elements: []};
  root.Preview = {
    selected: {camera, controls, isOrtho: false},
  };
  root.Project = {name: '皮肤'};
  root.Format = {render_sides: 'double'};
  root.settings = {render_sides: {value: 'double'}};
  root.Blockbench = {
    addCSS(css: string) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
      return {delete: () => style.remove()};
    },
    on(event: string, fn: Listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(fn);
      listeners.set(event, set);
    },
    removeListener(event: string, fn: Listener) {
      listeners.get(event)?.delete(fn);
    },
    dispatch(event: string) {
      listeners.get(event)?.forEach((fn) => fn());
    },
    showQuickMessage(text: string) {
      const toast = document.createElement('div');
      toast.textContent = text;
      toast.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:8px;z-index:80;font-size:12px';
      document.body.appendChild(toast);
      window.setTimeout(() => toast.remove(), 1600);
    },
    export(options: {content?: string; name?: string}) {
      const content = options.content ?? '';
      const filename = options.name || 'render';
      if (saveHandler) {
        saveHandler(content, filename);
        return;
      }
      downloadDataUrl(content, filename);
    },
  };
  root.Action = class Action {
    click?: () => void;
    constructor(_id: string, data: {click?: () => void}) {
      this.click = data.click;
    }
    delete(): void {}
  } as unknown as HostGlobals['Action'];
  root.MenuBar = {
    addAction(action: {click?: () => void}) {
      actions.push(action);
    },
  };
  root.BBPlugin = {
    register(_id: string, def: {onload?: () => void}) {
      def.onload?.();
    },
  };
  root.Dialog = class Dialog {
    object: HTMLElement;
    constructor(_id: string, opts: {title?: string; lines?: HTMLElement[]}) {
      this.object = document.createElement('div');
      this.object.className = 'dialog';
      this.object.style.cssText = 'display:flex;flex-direction:column;height:100%;min-height:0;background:#21252b;color:#d4d7dd';
      const handle = document.createElement('div');
      handle.className = 'dialog_handle';
      handle.textContent = opts.title ?? '';
      handle.style.cssText = 'padding:6px 10px;font-size:12px;background:#181a1f';
      const wrapper = document.createElement('div');
      wrapper.className = 'dialog_wrapper';
      wrapper.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column';
      const content = document.createElement('div');
      content.className = 'dialog_content';
      content.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden';
      for (const line of opts.lines ?? []) {
        content.appendChild(line);
      }
      wrapper.appendChild(content);
      this.object.append(handle, wrapper);
    }
    show(): void {
      const dock = document.getElementById('ptr-dock');
      if (!dock) {
        return;
      }
      dock.replaceChildren(this.object);
    }
    hide(): void {
      this.object.remove();
    }
    delete(): void {
      this.hide();
    }
  } as unknown as HostGlobals['Dialog'];
  root.Canvas.scene = scene;
  if (root.Preview.selected) {
    root.Preview.selected.camera = camera;
    root.Preview.selected.controls = controls;
  }
}

export function markEdited(): void {
  globals().Blockbench?.dispatch('finished_edit');
}

export function clearElements(): void {
  const list = globals().Outliner?.elements;
  if (list) {
    list.length = 0;
  }
}

export function adoptMesh(mesh: THREE.Mesh, texture: TracerTexture, name: string): TraceElement {
  const Ctor = globals().Cube;
  const element = new Ctor();
  element.id = makeId();
  element.name = name;
  element.mesh = mesh;
  element.visibility = true;
  element.faces = {};
  for (const face of FACE_ORDER) {
    element.faces[face] = {texture, getTexture: () => texture};
  }
  globals().Outliner.elements.push(element);
  return element;
}

export function forgetElement(element: TraceElement): void {
  const list = globals().Outliner.elements;
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

export function dropTexture(texture: TracerTexture): void {
  const all = globals().Texture.all;
  const index = all.indexOf(texture);
  if (index >= 0) {
    all.splice(index, 1);
  }
  texture.material.dispose();
}

export function createTexture(
  name: string,
  source: CanvasImageSource,
  width: number,
  height: number,
  mode: 'normal' | 'emissive' = 'normal',
): TracerTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('画布不可用');
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.flipY = true;
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });
  const texture: TracerTexture = {
    uuid: makeId(),
    name,
    canvas,
    img: canvas,
    source: canvas.toDataURL(),
    material,
    render_mode: mode === 'emissive' ? 'emissive' : 'normal',
    pbr_channel: 'color',
  };
  globals().Texture.all.push(texture);
  return texture;
}

const NIGHT_SKY = {
  env_mode: 'sky',
  bg_mode: 'env',
  sun_enable: true,
  sun_elevation: 42,
  sun_azimuth: 300,
  sun_intensity: 0.35,
  sun_angle: 3,
  sun_color: '#c8d8ff',
  sky_zenith: '#080d1c',
  sky_horizon: '#16203a',
  sky_ground: '#0a0a10',
  sky_haze: 0.2,
  env_intensity: 1,
};

function enableTracerFollow(): void {
  const key = 'pathtracer_preview_settings';
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, unknown>;
    const stockDay = (saved.sky_zenith == null || saved.sky_zenith === '#3c78c8')
      && (saved.sun_elevation == null || saved.sun_elevation === 48)
      && (saved.sun_intensity == null || saved.sun_intensity === 6);
    const next = stockDay ? {...saved, ...NIGHT_SKY} : saved;
    next.auto_sync = true;
    next.auto_follow = true;
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    localStorage.setItem(key, JSON.stringify({...NIGHT_SKY, auto_sync: true, auto_follow: true}));
  }
}

export function loadPathtracer(): Promise<void> {
  enableTracerFollow();
  if (booted) {
    actions[0]?.click?.();
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/null-k/pathtracer.js?v=2';
    script.onload = () => {
      booted = true;
      actions[0]?.click?.();
      resolve();
    };
    script.onerror = () => reject(new Error('路径追踪脚本没有加载'));
    document.body.appendChild(script);
  });
}
