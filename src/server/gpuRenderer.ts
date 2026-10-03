import {spawn, type ChildProcess} from 'node:child_process';
import {existsSync} from 'node:fs';

const PORT = 9477;
const PAGE = '/render/skin-pathtrace.html';
const STUDIO_PAGE = '/gpu-frame/';

interface RenderJob {
  skin: string;
  model: 'default' | 'slim';
  pose: string;
  samples: number;
  width: number;
  height: number;
  triangles?: number[];
  flipY?: boolean;
}

interface Socket {
  send(data: string): void;
  close(): void;
  addEventListener(type: string, listener: (event: {data: string}) => void): void;
}

interface Held {
  process?: ChildProcess;
  browser?: Socket;
  page?: Socket;
  call?: ReturnType<typeof cdp>;
  nextId: number;
}

const held: Held = {nextId: 1};
let queue: Promise<unknown> = Promise.resolve();
let jobs = 0;

export function gpuStatus(): {browser: boolean; jobs: number} {
  return {browser: Boolean(held.process), jobs};
}

function edgePath(): string {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error('服务器上没有找到 Edge，无法用显卡渲染');
  }
  return found;
}

async function debuggerIsUp(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

function waitForOpen(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve());
    socket.addEventListener('error', () => reject(new Error('连不上渲染进程')));
  });
}

function cdp(socket: Socket) {
  const pending = new Map<number, {resolve: (value: unknown) => void; reject: (error: Error) => void}>();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as {id?: number; result?: unknown; error?: {message?: string}};
    if (!message.id || !pending.has(message.id)) {
      return;
    }
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      waiter?.reject(new Error(message.error.message || '渲染进程调用失败'));
    } else {
      waiter?.resolve(message.result);
    }
  });
  return (method: string, params: Record<string, unknown> = {}) => new Promise((resolve, reject) => {
    const id = held.nextId;
    held.nextId += 1;
    pending.set(id, {resolve, reject});
    socket.send(JSON.stringify({id, method, params}));
  });
}

async function ensureBrowser(): Promise<void> {
  if (await debuggerIsUp()) {
    return;
  }
  const child = spawn(edgePath(), [
    '--headless=new',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--enable-gpu',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--no-first-run',
    '--disable-sync',
    `--user-data-dir=${process.env.TEMP || '.'}/sincerity-skin-gpu`,
    `--remote-debugging-port=${PORT}`,
    'about:blank',
  ], {stdio: 'ignore'});
  held.process = child;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await debuggerIsUp()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('服务器显卡渲染进程没有启动');
}

async function ensurePage(origin: string): Promise<ReturnType<typeof cdp>> {
  await ensureBrowser();
  if (held.page && held.call) {
    return held.call;
  }
  const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json() as {webSocketDebuggerUrl: string};
  const browser = new WebSocket(version.webSocketDebuggerUrl);
  await waitForOpen(browser);
  held.browser = browser;
  const browserCall = cdp(browser);
  const created = await browserCall('Target.createTarget', {url: 'about:blank'}) as {targetId: string};
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() as {id: string; webSocketDebuggerUrl: string}[];
  const pageInfo = targets.find((target) => target.id === created.targetId);
  if (!pageInfo) {
    throw new Error('打不开渲染页面');
  }
  const page = new WebSocket(pageInfo.webSocketDebuggerUrl);
  await waitForOpen(page);
  held.page = page;
  const call = cdp(page);
  held.call = call;
  await call('Page.enable');
  await call('Page.navigate', {url: `${origin}${PAGE}`});
  for (let attempt = 0; attempt < 40; attempt++) {
    const ready = await call('Runtime.evaluate', {expression: 'typeof renderSkin === "function"', returnByValue: true}) as {result?: {value?: boolean}};
    if (ready.result?.value) {
      return call;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('渲染页面没有准备好');
}

async function waitUntilReady(call: ReturnType<typeof cdp>, expression = 'typeof renderSkin === "function"'): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const ready = await call('Runtime.evaluate', {expression, returnByValue: true}) as {result?: {value?: boolean}};
    if (ready.result?.value) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('渲染页面没有准备好');
}

async function renderJob(job: RenderJob, origin: string): Promise<Uint8Array> {
  jobs += 1;
  try {
  const call = await ensurePage(origin);
  await call('Page.navigate', {url: `${origin}${PAGE}`});
  await waitUntilReady(call);
  const payload = JSON.stringify(job);
  const evaluated = await call('Runtime.evaluate', {
    expression: `renderSkin(${payload})`,
    awaitPromise: true,
    returnByValue: true,
  }) as {result?: {value?: {ok?: boolean; png?: string; error?: string}}; exceptionDetails?: {text?: string; exception?: {description?: string}}};
  if (evaluated.exceptionDetails) {
    throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text || '显卡渲染失败');
  }
  const value = evaluated.result?.value;
  if (!value?.ok || !value.png) {
    throw new Error(value?.error || '显卡渲染没有返回图片');
  }
  const base64 = value.png.split(',')[1] ?? '';
  return Buffer.from(base64, 'base64');
  } finally {
    jobs -= 1;
  }
}

async function renderStudioJob(job: unknown, origin: string): Promise<Uint8Array> {
  jobs += 1;
  try {
  const call = await ensurePage(origin);
  await call('Page.navigate', {url: `${origin}${STUDIO_PAGE}`});
  await waitUntilReady(call, 'typeof renderScene === "function"');
  const payload = JSON.stringify(job);
  const evaluated = await call('Runtime.evaluate', {
    expression: `renderScene(${payload})`,
    awaitPromise: true,
    returnByValue: true,
  }) as {result?: {value?: {ok?: boolean; png?: string; error?: string}}; exceptionDetails?: {text?: string; exception?: {description?: string}}};
  if (evaluated.exceptionDetails) {
    throw new Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text || '显卡渲染失败');
  }
  const value = evaluated.result?.value;
  if (!value?.ok || !value.png) {
    throw new Error(value?.error || '显卡渲染没有返回图片');
  }
  const base64 = value.png.split(',')[1] ?? '';
  return Buffer.from(base64, 'base64');
  } finally {
    jobs -= 1;
  }
}

/** 排队调用服务器上的 Edge 显卡进程，一次只渲染一张。 */
export function renderSkinOnGpu(job: RenderJob, origin: string): Promise<Uint8Array> {
  const run = queue.then(() => renderJob(job, origin), () => renderJob(job, origin));
  queue = run.then(() => undefined, () => undefined);
  return run;
}

/** 用当前场景在服务器显卡上跑路径追踪。 */
export function renderStudioOnGpu(job: unknown, origin: string): Promise<Uint8Array> {
  const run = queue.then(() => renderStudioJob(job, origin), () => renderStudioJob(job, origin));
  queue = run.then(() => undefined, () => undefined);
  return run;
}
