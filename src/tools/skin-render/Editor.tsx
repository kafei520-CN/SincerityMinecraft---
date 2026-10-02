import {useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {TransformControls} from 'three/examples/jsm/controls/TransformControls.js';
import {
  adoptMesh,
  createTexture,
  dropTexture,
  forgetElement,
  downloadDataUrl,
  installHost,
  loadPathtracer,
  markEdited,
  setSaveHandler,
  type TraceElement,
  type TracerTexture,
} from './host';
import {itemMesh, listPackItems, unzip} from './pack';
import {buildPlayer, type BuiltPart} from './player';


type Vec3 = [number, number, number];
type Kind = 'player' | 'part' | 'item' | 'light';
type ToolMode = 'move' | 'rotate' | 'camera';

interface LightProps {
  color: string;
  brightness: number;
  size: number;
}

interface SceneNode {
  id: string;
  name: string;
  kind: Kind;
  object: THREE.Object3D;
  elements: TraceElement[];
  texture?: TracerTexture;
  light?: LightProps;
}

interface SceneApi {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  transform: TransformControls;
  root: THREE.Group;
  parts: Map<string, BuiltPart>;
  nodes: SceneNode[];
  skin?: TracerTexture;
}

const inputClass = 'w-full rounded border border-[#181a1f] bg-[#1b1e24] px-2 py-1 text-xs outline-none focus:border-[#3e90ff]';
const menuItem = 'block w-full cursor-pointer whitespace-nowrap px-3 py-2 text-left hover:bg-[#3e90ff] hover:text-white';

export default function Editor() {
  const viewRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const [selected, setSelected] = useState('player');
  const [slim, setSlim] = useState(false);
  const [error, setError] = useState('');
  const [packItems, setPackItems] = useState<string[]>([]);
  const [packId, setPackId] = useState('');
  const [lightColor, setLightColor] = useState('#fff2dd');
  const [pos, setPos] = useState<Vec3>([0, 0, 0]);
  const [rot, setRot] = useState<Vec3>([0, 0, 0]);
  const [fov, setFov] = useState(30);
  const [tool, setTool] = useState<ToolMode>('move');
  const [lightBrightness, setLightBrightness] = useState(6);
  const [lightSize, setLightSize] = useState(4);
  const [lightTint, setLightTint] = useState('#fff2dd');
  const [resultUrl, setResultUrl] = useState('');
  const [panel, setPanel] = useState<'view' | 'tree' | 'render'>('view');
  const [treeWidth, setTreeWidth] = useState(240);
  const [renderWidth, setRenderWidth] = useState(680);
  const [sideWidth, setSideWidth] = useState(360);
  const toolRef = useRef<ToolMode>('move');
  const [yaw, setYaw] = useState(32);
  const [pitch, setPitch] = useState(68);
  const packRef = useRef<Map<string, Uint8Array> | null>(null);

  useEffect(() => {
    const host = viewRef.current;
    if (!host) {
      return undefined;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    document.head.appendChild(link);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111418');
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 2000);
    camera.position.set(36, 22, 78);
    const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 16, 0);
    controls.enableDamping = true;
    controls.mouseButtons.LEFT = -1 as unknown as THREE.MOUSE;
    camera.lookAt(controls.target);
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode('translate');
    transform.setSize(0.75);
    scene.add(transform);
    transform.addEventListener('mouseDown', () => {
      controls.enabled = false;
    });
    transform.addEventListener('mouseUp', () => {
      controls.enabled = true;
      markEdited();
    });
    transform.addEventListener('change', () => {
      const object = transform.object;
      if (!object) {
        return;
      }
      setPos([object.position.x, object.position.y, object.position.z]);
      setRot(toDeg(object.rotation));
    });
    const grid = new THREE.GridHelper(64, 32, '#2a3140', '#1a1f29');
    scene.add(grid);
    scene.add(new THREE.AmbientLight('#ffffff', 0.7));
    const sun = new THREE.DirectionalLight('#fff6e8', 1.1);
    sun.position.set(20, 40, 24);
    scene.add(sun);
    const root = new THREE.Group();
    root.name = '玩家';
    scene.add(root);
    installHost(scene, camera, controls);
    const api: SceneApi = {scene, camera, controls, transform, root, parts: new Map(), nodes: []};
    apiRef.current = api;

    const resize = () => {
      const box = host.getBoundingClientRect();
      camera.aspect = Math.max(1, box.width) / Math.max(1, box.height);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(1, box.width), Math.max(1, box.height));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
    void loadPathtracer().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : '路径追踪没有打开');
    });
    mountSkin(api, paintSkin(), false);
    publish(api);
    attachGizmo('player');

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      transform.detach();
      transform.dispose();
      controls.dispose();
      renderer.dispose();
      link.remove();
      host.replaceChildren();
    };
  }, []);

  function publish(api: SceneApi): void {
    setNodes([...api.nodes]);
  }

  function readSelection(id: string): void {
    const node = apiRef.current?.nodes.find((entry) => entry.id === id);
    if (!node) {
      return;
    }
    setSelected(id);
    setPos([node.object.position.x, node.object.position.y, node.object.position.z]);
    setRot(toDeg(node.object.rotation));
    if (node.light) {
      setLightTint(node.light.color);
      setLightBrightness(node.light.brightness);
      setLightSize(node.light.size);
    }
    attachGizmo(id);
  }

  function chooseTool(next: ToolMode): void {
    toolRef.current = next;
    setTool(next);
    const api = apiRef.current;
    if (!api) {
      return;
    }
    api.controls.mouseButtons.LEFT = next === 'camera' ? THREE.MOUSE.ROTATE : -1 as unknown as THREE.MOUSE;
    if (next === 'camera') {
      api.transform.detach();
      return;
    }
    api.transform.setMode(next === 'move' ? 'translate' : 'rotate');
    attachGizmo(selected);
  }

  function attachGizmo(id: string): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const node = api.nodes.find((entry) => entry.id === id);
    if (!node || toolRef.current === 'camera') {
      api.transform.detach();
      return;
    }
    api.transform.setMode(toolRef.current === 'move' ? 'translate' : 'rotate');
    api.transform.attach(node.object);
  }

  function writeTransform(nextPos: Vec3, nextRot: Vec3): void {
    const node = apiRef.current?.nodes.find((entry) => entry.id === selected);
    if (!node) {
      return;
    }
    node.object.position.set(nextPos[0], nextPos[1], nextPos[2]);
    node.object.rotation.set(nextRot[0] * Math.PI / 180, nextRot[1] * Math.PI / 180, nextRot[2] * Math.PI / 180);
    node.object.updateMatrixWorld(true);
    setPos(nextPos);
    setRot(nextRot);
    markEdited();
  }

  function applyCamera(next: {fov?: number; yaw?: number; pitch?: number}): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const nextFov = next.fov ?? fov;
    const nextYaw = next.yaw ?? yaw;
    const nextPitch = next.pitch ?? pitch;
    setFov(nextFov);
    setYaw(nextYaw);
    setPitch(nextPitch);
    api.camera.fov = nextFov;
    api.camera.updateProjectionMatrix();
    const distance = api.camera.position.distanceTo(api.controls.target);
    const phi = nextPitch * Math.PI / 180;
    const theta = nextYaw * Math.PI / 180;
    const target = api.controls.target;
    api.camera.position.set(
      target.x + distance * Math.sin(phi) * Math.sin(theta),
      target.y + distance * Math.cos(phi),
      target.z + distance * Math.sin(phi) * Math.cos(theta),
    );
    api.camera.lookAt(target);
  }

  async function useSkinBlob(blob: Blob): Promise<void> {
    const image = await loadImage(URL.createObjectURL(blob));
    const api = apiRef.current;
    if (!api) {
      return;
    }
    mountSkin(api, image, slim);
    publish(api);
    attachGizmo(selected);
    markEdited();
  }

  function changeSlim(next: boolean): void {
    setSlim(next);
    const api = apiRef.current;
    if (!api?.skin) {
      return;
    }
    const image = api.skin.img;
    mountSkin(api, image, next);
    publish(api);
    attachGizmo(selected);
    markEdited();
  }

  async function usePack(file: File): Promise<void> {
    setError('');
    try {
      const files = await unzip(await file.arrayBuffer());
      packRef.current = files;
      const items = listPackItems(files);
      setPackItems(items);
      const preferred = items.find((id) => id.endsWith(':diamond_pickaxe')) ?? items.find((id) => id.includes('pickaxe')) ?? items[0] ?? '';
      setPackId(preferred);
      if (!items.length) {
        setError('资源包里没有物品模型');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '资源包读不了');
    }
  }

  async function putItem(): Promise<void> {
    const files = packRef.current;
    const api = apiRef.current;
    if (!files || !api || packId === '') {
      setError('先选择资源包里的物品');
      return;
    }
    setError('');
    try {
      const item = await itemMesh(files, packId);
      const image = await loadImageBlob(item.png);
      const frame = firstFrame(image);
      const texture = createTexture(item.name, frame, frame.width, frame.height);
      const mesh = new THREE.Mesh(item.geometry, texture.material);
      mesh.position.set(-1, -14, 2);
      mesh.rotation.x = -Math.PI / 2.4;
      const arm = api.parts.get('rightArm');
      (arm?.pivot ?? api.root).add(mesh);
      const element = adoptMesh(mesh, texture, item.name);
      const node: SceneNode = {
        id: element.id,
        name: item.name,
        kind: 'item',
        object: mesh,
        elements: [element],
        texture,
      };
      api.nodes.push(node);
      publish(api);
      readSelection(node.id);
      markEdited();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '物品放不进去');
    }
  }

  function addLight(): void {
    const api = apiRef.current;
    if (!api) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, 4, 4);
    const lightName = `自发光 ${api.nodes.filter((entry) => entry.kind === 'light').length + 1}`;
    const texture = createTexture(lightName, canvas, 4, 4, 'emissive');
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), texture.material);
    mesh.position.set(14, 22, 6);
    const lamp = new THREE.PointLight(lightColor, 6, 80, 2);
    mesh.add(lamp);
    api.scene.add(mesh);
    const element = adoptMesh(mesh, texture, lightName);
    const light = {color: lightColor, brightness: 6, size: 4};
    const node: SceneNode = {id: element.id, name: lightName, kind: 'light', object: mesh, elements: [element], texture, light};
    api.nodes.push(node);
    publish(api);
    readSelection(node.id);
    markEdited();
    window.setTimeout(() => pushEmissive(lightName, light.brightness), 700);
  }

  function updateLight(patch: Partial<LightProps>): void {
    const api = apiRef.current;
    const node = api?.nodes.find((entry) => entry.id === selected);
    if (!api || !node?.light || !node.texture) {
      return;
    }
    const light = {...node.light, ...patch};
    node.light = light;
    setLightTint(light.color);
    setLightBrightness(light.brightness);
    setLightSize(light.size);
    const mesh = node.object as THREE.Mesh;
    mesh.scale.setScalar(light.size / 4);
    const ctx = node.texture.canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = light.color;
      ctx.fillRect(0, 0, node.texture.canvas.width, node.texture.canvas.height);
    }
    node.texture.source = node.texture.canvas.toDataURL();
    const material = mesh.material as THREE.MeshBasicMaterial;
    if (material.color) {
      material.color.set(light.color);
    }
    if (material.map) {
      material.map.needsUpdate = true;
    }
    const lamp = mesh.children.find((child) => child instanceof THREE.PointLight) as THREE.PointLight | undefined;
    if (lamp) {
      lamp.color.set(light.color);
      lamp.intensity = light.brightness;
    }
    pushEmissive(node.name, light.brightness);
    markEdited();
  }

  function captureTracer(): string {
    const hooked = (globalThis as {__taoistCaptureTracer?: () => string}).__taoistCaptureTracer;
    const captured = hooked?.() ?? '';
    if (captured.startsWith('data:image')) {
      return captured;
    }
    const canvas = document.querySelector('#ptr_canvas');
    if (!(canvas instanceof HTMLCanvasElement) || canvas.width < 2) {
      throw new Error('右边的渲染还没有画面');
    }
    return canvas.toDataURL('image/png');
  }

  function showTracerImage(): void {
    setError('');
    try {
      const url = captureTracer();
      setResultUrl((current) => {
        if (current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return url;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '没有可保存的画面');
    }
  }

  function saveResult(): void {
    try {
      downloadDataUrl(resultUrl || captureTracer(), 'render');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '没有可保存的画面');
    }
  }

  setSaveHandler((fallback, filename) => {
    if (fallback.startsWith('data:image')) {
      downloadDataUrl(fallback, filename);
      return;
    }
    saveResult();
  });

  function removeSelected(): void {
    const api = apiRef.current;
    const node = api?.nodes.find((entry) => entry.id === selected);
    if (!api || !node || node.kind === 'player' || node.kind === 'part') {
      return;
    }
    node.object.parent?.remove(node.object);
    node.object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
    });
    for (const element of node.elements) {
      forgetElement(element);
    }
    if (node.texture) {
      dropTexture(node.texture);
    }
    api.nodes = api.nodes.filter((entry) => entry.id !== node.id);
    publish(api);
    readSelection('player');
    markEdited();
  }

  const selectedNode = nodes.find((entry) => entry.id === selected);

  return (
    <div
      className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#21252b] text-[#d4d7dd]"
      style={{
        ['--tree-w' as string]: `${treeWidth}px`,
        ['--render-w' as string]: `${renderWidth}px`,
        ['--ptr-side' as string]: `${sideWidth}px`,
        ['--color-ui' as string]: '#282c34',
        ['--color-back' as string]: '#21252b',
        ['--color-text' as string]: '#d4d7dd',
        ['--color-light' as string]: '#ffffff',
        ['--color-subtle_text' as string]: '#8b919a',
        ['--color-border' as string]: '#181a1f',
        ['--color-selected' as string]: '#3a4252',
        ['--color-accent' as string]: '#3e90ff',
        ['--color-accent_text' as string]: '#ffffff',
        ['--color-button' as string]: '#1b1e24',
      }}
    >
      <header className="flex shrink-0 items-center gap-1 border-b border-[#181a1f] bg-[#181a1f] px-2 py-1 text-sm">
        <Menu label="文件">
          {(close) => (
            <>
              <label className={menuItem}>
                导入皮肤文件
                <input className="sr-only" type="file" accept="image/png" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void useSkinBlob(file).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : '皮肤读不了'));
                  }
                  close();
                }} />
              </label>
              <label className={menuItem}>
                导入资源包
                <input className="sr-only" type="file" accept=".zip,application/zip" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void usePack(file);
                  }
                  close();
                }} />
              </label>
              <button type="button" className={menuItem} onClick={() => { showTracerImage(); close(); }}>渲染</button>
              <button type="button" className={menuItem} onClick={() => { saveResult(); close(); }}>保存</button>
            </>
          )}
        </Menu>
        <Menu label="工具">
          {() => (
            <>
              <button type="button" className={menuItem} onClick={() => changeSlim(false)}>粗手臂{slim ? '' : '  ✓'}</button>
              <button type="button" className={menuItem} onClick={() => changeSlim(true)}>细手臂{slim ? '  ✓' : ''}</button>
              <div className="space-y-2 border-t border-[#181a1f] px-3 py-2">
                <select className={inputClass} value={packId} onChange={(event) => setPackId(event.target.value)}>
                  {packItems.length === 0 && <option value="">未载入物品</option>}
                  {packItems.map((id) => <option key={id} value={id}>{id.split(':')[1]}</option>)}
                </select>
                <button type="button" className={`${menuItem} px-0`} onClick={() => void putItem()}>放到右手</button>
                <label className="flex items-center justify-between gap-3 whitespace-nowrap">
                  自发光颜色
                  <input type="color" value={lightColor} aria-label="自发光颜色" onChange={(event) => setLightColor(event.target.value)} />
                </label>
                <button type="button" className={`${menuItem} px-0`} onClick={addLight}>自发光体</button>
                <label className="flex items-center gap-2 whitespace-nowrap">
                  焦距
                  <input className="w-24" type="range" min={10} max={80} value={fov} onChange={(event) => applyCamera({fov: Number(event.target.value)})} />
                  <span className="w-6">{fov}</span>
                </label>
              </div>
            </>
          )}
        </Menu>
      </header>
      {error !== '' && <p className="shrink-0 bg-[#3a2424] px-3 py-1 text-xs text-[#ffb4b4]">{error}</p>}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className={`${panel === 'tree' ? 'flex' : 'hidden'} tree-pane order-2 max-h-[46dvh] w-full shrink-0 flex-col bg-[#282c34] lg:order-1 lg:flex lg:max-h-none`}>
          <p className="px-3 py-2 text-[11px] tracking-wide text-[#8b919a]">大纲</p>
          <ul className="min-h-0 flex-1 overflow-auto">
            {nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  className={`block w-full px-3 py-1.5 text-left text-sm ${node.id === selected ? 'bg-[#3e90ff] text-white' : 'hover:bg-[#32363e]'}`}
                  onClick={() => readSelection(node.id)}
                >
                  {node.name}
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-[#181a1f] p-3">
            <p className="text-[11px] text-[#8b919a]">{selectedNode?.name ?? '未选择'} 的位置</p>
            <VecFields value={pos} step={0.5} onChange={(next) => writeTransform(next, rot)} />
            <p className="text-[11px] text-[#8b919a]">旋转（度）</p>
            <VecFields value={rot} step={1} onChange={(next) => writeTransform(pos, next)} />
            {selectedNode?.kind === 'light' && selectedNode.light && (
              <>
                <p className="text-[11px] text-[#8b919a]">自发光属性</p>
                <label className="flex items-center justify-between text-[11px]">颜色
                  <input type="color" value={lightTint} aria-label="发光颜色" onChange={(event) => updateLight({color: event.target.value})} />
                </label>
                <label className="flex items-center gap-2 text-[11px]">亮度
                  <input className="flex-1" type="range" min={0} max={20} step={0.1} value={lightBrightness} onChange={(event) => updateLight({brightness: Number(event.target.value)})} />
                  <span className="w-8">{lightBrightness.toFixed(1)}</span>
                </label>
                <label className="flex items-center gap-2 text-[11px]">大小
                  <input className="flex-1" type="range" min={1} max={48} step={0.5} value={lightSize} onChange={(event) => updateLight({size: Number(event.target.value)})} />
                  <span className="w-8">{lightSize.toFixed(1)}</span>
                </label>
              </>
            )}
            {selectedNode && selectedNode.kind !== 'player' && selectedNode.kind !== 'part' && (
              <button type="button" className="rounded bg-[#3a2424] px-2 py-1 text-xs" onClick={removeSelected}>删除</button>
            )}
            <p className="text-[11px] text-[#8b919a]">视角</p>
            <label className="flex items-center gap-2 text-[11px]">水平
              <input className="flex-1" type="range" min={-180} max={180} value={yaw} onChange={(event) => applyCamera({yaw: Number(event.target.value)})} />
            </label>
            <label className="flex items-center gap-2 text-[11px]">俯仰
              <input className="flex-1" type="range" min={8} max={172} value={pitch} onChange={(event) => applyCamera({pitch: Number(event.target.value)})} />
            </label>
          </div>
        </aside>
        <Splitter order="lg:order-1" start={treeWidth} min={180} max={520} apply={setTreeWidth} />
        <div ref={viewRef} className={`${panel === 'view' ? 'block' : 'hidden'} relative order-1 min-h-0 flex-1 bg-[#111418] lg:order-2 lg:block lg:min-w-[200px]`}>
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {([['move', '移动'], ['rotate', '旋转'], ['camera', '摄像机']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded px-2 py-1 text-xs ${tool === id ? 'bg-[#3e90ff] text-white' : 'bg-[#32363e] text-[#d4d7dd]'}`}
                onClick={() => chooseTool(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Splitter order="lg:order-2" start={renderWidth} min={420} max={1100} sign={-1} apply={setRenderWidth} />
        <div className={`${panel === 'render' ? 'flex' : 'hidden'} render-pane relative order-3 h-[70dvh] w-full shrink-0 border-t border-[#181a1f] bg-[#21252b] lg:flex lg:h-auto lg:border-t-0`}>
          <div id="ptr-dock" className="min-h-0 min-w-0 flex-1 overflow-hidden" />
          <Splitter edge start={sideWidth} min={220} max={640} sign={-1} apply={setSideWidth} />
        </div>
        <div className="flex shrink-0 border-t border-[#181a1f] lg:hidden">
          {([['view', '视口'], ['tree', '大纲'], ['render', '渲染']] as const).map(([id, label]) => (
            <button key={id} type="button" className={`flex-1 py-3 text-sm ${panel === id ? 'bg-[#3e90ff] text-white' : 'bg-[#181a1f]'}`} onClick={() => setPanel(id)}>{label}</button>
          ))}
        </div>
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .tree-pane { width: var(--tree-w); }
          .render-pane { width: var(--render-w); }
        }
        #ptr-dock #ptr_sidebar {
          width: var(--ptr-side) !important;
          flex: 0 0 var(--ptr-side) !important;
        }
      `}</style>
      {resultUrl !== '' && (
        <div className="absolute inset-0 z-30 flex flex-col bg-black/80">
          <img src={resultUrl} alt="" className="min-h-0 flex-1 object-contain" />
          <div className="flex gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" className="rounded bg-[#3e90ff] px-3 py-2 text-sm text-white" onClick={saveResult}>保存</button>
            <button type="button" className="rounded bg-[#32363e] px-3 py-2 text-sm" onClick={() => setResultUrl('')}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function Splitter({start, min, max, sign = 1, edge = false, order = '', apply}: {start: number; min: number; max: number; sign?: number; edge?: boolean; order?: string; apply: (next: number) => void}) {
  const drag = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = event.clientX;
    const move = (pointer: PointerEvent) => apply(clamp(start + (pointer.clientX - origin) * sign, min, max));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={edge
        ? 'absolute top-0 bottom-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize hover:bg-[#3e90ff] lg:block'
        : `relative z-20 hidden w-2 shrink-0 cursor-col-resize bg-[#181a1f] hover:bg-[#3e90ff] lg:block ${order}`}
      style={edge ? {right: 'var(--ptr-side)'} : undefined}
      onPointerDown={drag}
    />
  );
}

function Menu({label, children}: {label: string; children: (close: () => void) => ReactNode}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button type="button" className="rounded px-3 py-1.5 whitespace-nowrap hover:bg-[#32363e]" onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-40 mt-1 min-w-48 rounded border border-[#181a1f] bg-[#282c34] py-1 shadow-lg">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function formatAxis(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return String(Math.round(value * 1000) / 1000);
}

function AxisInput({value, onChange}: {value: number; onChange: (next: number) => void}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={`${inputClass} mt-0.5`}
      type="text"
      inputMode="decimal"
      value={draft ?? formatAxis(value)}
      onFocus={() => setDraft(formatAxis(value))}
      onChange={(event) => {
        const raw = event.target.value;
        if (!/^-?\d*\.?\d*$/.test(raw)) {
          return;
        }
        setDraft(raw);
        if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
          return;
        }
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          onChange(parsed);
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function VecFields({value, onChange}: {value: Vec3; step: number; onChange: (next: Vec3) => void}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {(['X', 'Y', 'Z'] as const).map((axis, index) => (
        <label key={axis} className="text-[10px] text-[#8b919a]">
          {axis}
          <AxisInput
            value={value[index]}
            onChange={(nextValue) => {
              const next: Vec3 = [value[0], value[1], value[2]];
              next[index] = nextValue;
              onChange(next);
            }}
          />
        </label>
      ))}
    </div>
  );
}

function mountSkin(api: SceneApi, image: CanvasImageSource & {width: number; height: number}, slim: boolean): void {
  const kept = new Map<string, {pos: Vec3; rot: Vec3}>();
  for (const [id, part] of api.parts) {
    kept.set(id, {
      pos: [part.pivot.position.x, part.pivot.position.y, part.pivot.position.z],
      rot: toDeg(part.pivot.rotation),
    });
  }
  const carried = api.nodes.filter((node) => node.kind === 'item');
  for (const node of carried) {
    node.object.parent?.remove(node.object);
  }
  for (const node of api.nodes) {
    if (node.kind === 'player' || node.kind === 'part') {
      for (const element of node.elements) {
        forgetElement(element);
      }
    }
  }
  api.root.clear();
  api.parts.forEach((part) => {
    part.meshes.forEach((mesh) => mesh.geometry.dispose());
  });
  api.parts.clear();
  if (api.skin) {
    dropTexture(api.skin);
  }
  const texture = createTexture('皮肤', image, image.width, image.height);
  api.skin = texture;
  const parts = buildPlayer(slim, texture.material, image.width, image.height);
  const partNodes: SceneNode[] = [];
  for (const part of parts) {
    const saved = kept.get(part.id);
    if (saved) {
      part.pivot.position.set(saved.pos[0], saved.pos[1], saved.pos[2]);
      part.pivot.rotation.set(saved.rot[0] * Math.PI / 180, saved.rot[1] * Math.PI / 180, saved.rot[2] * Math.PI / 180);
    }
    api.root.add(part.pivot);
    api.parts.set(part.id, part);
    partNodes.push({
      id: part.id,
      name: part.name,
      kind: 'part',
      object: part.pivot,
      elements: part.meshes.map((mesh) => adoptMesh(mesh, texture, part.name)),
    });
  }
  const arm = api.parts.get('rightArm');
  for (const node of carried) {
    (arm?.pivot ?? api.root).add(node.object);
  }
  const extras = api.nodes.filter((node) => node.kind === 'item' || node.kind === 'light');
  api.nodes = [
    {id: 'player', name: '玩家', kind: 'player', object: api.root, elements: []},
    ...partNodes,
    ...extras,
  ];
}

function paintSkin(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = '#f4f4f4';
  // 只填基础层。帽子、外套、袖子、裤管保持透明，白模不会再包一层。
  for (const [x, y, w, h] of [
    [0, 0, 32, 16],
    [0, 16, 16, 16],
    [16, 16, 24, 16],
    [40, 16, 16, 16],
    [16, 48, 16, 16],
    [32, 48, 16, 16],
  ] as const) {
    ctx.fillRect(x, y, w, h);
  }
  return canvas;
}

function firstFrame(image: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  if (image.height <= image.width || image.height % image.width !== 0) {
    return image;
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.width;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(image, 0, 0, image.width, image.width, 0, 0, image.width, image.width);
  return canvas;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => reject(new Error('皮肤读不了'));
    image.src = url;
  });
}

function loadImageBlob(bytes: Uint8Array): Promise<HTMLImageElement> {
  const copy = new Uint8Array(bytes);
  return loadImage(URL.createObjectURL(new Blob([copy], {type: 'image/png'})));
}

function pushEmissive(textureName: string, brightness: number): void {
  const boxes = document.querySelectorAll('#ptr_matlist .ptr_mat');
  for (const box of boxes) {
    if (box.querySelector('.ptr_mat_head span')?.textContent !== textureName) {
      continue;
    }
    for (const row of box.querySelectorAll('.ptr_row')) {
      if (row.querySelector('label')?.textContent !== '自发光') {
        continue;
      }
      const number = row.querySelector('input[type="number"]');
      if (!(number instanceof HTMLInputElement)) {
        return;
      }
      number.value = String(brightness);
      number.dispatchEvent(new Event('change', {bubbles: true}));
      return;
    }
  }
}

function toDeg(rotation: THREE.Euler): Vec3 {
  return [rotation.x * 180 / Math.PI, rotation.y * 180 / Math.PI, rotation.z * 180 / Math.PI];
}
