import {existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {makeId} from '../tools/skin-render/id';

export interface Version {
  id: string;
  label: string;
  filename: string;
  size: number;
  at: number;
}

export interface AppPack {
  id: string;
  name: string;
  icon: string;
  versions: Version[];
}

const ROOT = join(process.cwd(), 'data', 'downloads');
const CATALOG = join(ROOT, 'catalog.json');

function ensure(): void {
  mkdirSync(join(ROOT, 'files'), {recursive: true});
  mkdirSync(join(ROOT, 'icons'), {recursive: true});
  if (!existsSync(CATALOG)) {
    writeFileSync(CATALOG, '{"apps":[]}');
  }
}

function read(): {apps: AppPack[]} {
  ensure();
  return JSON.parse(readFileSync(CATALOG, 'utf8')) as {apps: AppPack[]};
}

function write(data: {apps: AppPack[]}): void {
  ensure();
  writeFileSync(CATALOG, JSON.stringify(data, null, 2));
}

export function listApps(): AppPack[] {
  return read().apps;
}

export function addApp(name: string, iconName: string, iconBytes: Uint8Array): AppPack {
  const data = read();
  const id = makeId();
  const icon = `${id}${extOf(iconName)}`;
  writeFileSync(join(ROOT, 'icons', icon), iconBytes);
  const app: AppPack = {id, name, icon, versions: []};
  data.apps.push(app);
  write(data);
  return app;
}

export function addVersion(appId: string, label: string, filename: string, bytes: Uint8Array): Version {
  const data = read();
  const app = data.apps.find((entry) => entry.id === appId);
  if (!app) {
    throw new Error('没有这个应用');
  }
  const id = makeId();
  const safe = filename.replace(/[\\/]/g, '_');
  const dir = join(ROOT, 'files', appId);
  mkdirSync(dir, {recursive: true});
  const stored = `${id}-${safe}`;
  writeFileSync(join(dir, stored), bytes);
  const version: Version = {id, label, filename: stored, size: bytes.byteLength, at: Date.now()};
  app.versions.push(version);
  write(data);
  return version;
}

export function removeApp(appId: string): void {
  const data = read();
  const app = data.apps.find((entry) => entry.id === appId);
  if (!app) {
    return;
  }
  for (const version of app.versions) {
    const file = join(ROOT, 'files', appId, version.filename);
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
  const icon = join(ROOT, 'icons', app.icon);
  if (existsSync(icon)) {
    unlinkSync(icon);
  }
  data.apps = data.apps.filter((entry) => entry.id !== appId);
  write(data);
}

export function removeVersion(appId: string, versionId: string): void {
  const data = read();
  const app = data.apps.find((entry) => entry.id === appId);
  if (!app) {
    return;
  }
  const version = app.versions.find((entry) => entry.id === versionId);
  if (version) {
    const file = join(ROOT, 'files', appId, version.filename);
    if (existsSync(file)) {
      unlinkSync(file);
    }
  }
  app.versions = app.versions.filter((entry) => entry.id !== versionId);
  write(data);
}

export function iconPath(icon: string): string {
  return join(ROOT, 'icons', icon);
}

export function filePath(appId: string, filename: string): string {
  return join(ROOT, 'files', appId, filename);
}

export function findApp(appId: string): AppPack | undefined {
  return read().apps.find((entry) => entry.id === appId);
}

function extOf(name: string): string {
  const match = /\.(png|jpe?g|webp|gif|svg)$/i.exec(name);
  return match ? match[0].toLowerCase() : '.png';
}
