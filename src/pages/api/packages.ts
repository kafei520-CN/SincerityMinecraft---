import type {APIRoute} from 'astro';
import {createReadStream, existsSync} from 'node:fs';
import {Readable} from 'node:stream';
import {filePath, findApp, iconPath, listApps} from '../../server/packages';

export const prerender = false;

export const GET: APIRoute = async ({url}) => {
  const kind = url.searchParams.get('kind');
  const appId = url.searchParams.get('app') ?? '';
  if (kind === 'icon') {
    const app = findApp(appId);
    if (!app) {
      return new Response('没有图标', {status: 404});
    }
    const path = iconPath(app.icon);
    if (!existsSync(path)) {
      return new Response('没有图标', {status: 404});
    }
    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
    return new Response(stream, {headers: {'content-type': typeOf(app.icon), 'cache-control': 'public, max-age=3600'}});
  }
  if (kind === 'file') {
    const app = findApp(appId);
    const versionId = url.searchParams.get('ver') ?? '';
    const version = app?.versions.find((entry) => entry.id === versionId);
    if (!app || !version) {
      return new Response('没有这个安装包', {status: 404});
    }
    const path = filePath(app.id, version.filename);
    if (!existsSync(path)) {
      return new Response('文件不在了', {status: 404});
    }
    const stream = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
    const name = version.filename.replace(/^[0-9a-f-]+-/, '');
    return new Response(stream, {
      headers: {
        'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        'content-length': String(version.size),
      },
    });
  }
  return Response.json({apps: listApps()});
};

function typeOf(name: string): string {
  if (name.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (name.endsWith('.webp')) {
    return 'image/webp';
  }
  if (name.endsWith('.gif')) {
    return 'image/gif';
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return 'image/png';
}
