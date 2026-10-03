import type {APIRoute} from 'astro';
import {requireAdmin} from '../../../server/auth';
import {addApp, addVersion, listApps, removeApp, removeVersion} from '../../../server/packages';

export const prerender = false;

export const GET: APIRoute = async ({request}) => {
  if (!requireAdmin(request)) {
    return Response.json({error: '未登录'}, {status: 401});
  }
  return Response.json({apps: listApps()});
};

export const POST: APIRoute = async ({request}) => {
  if (!requireAdmin(request)) {
    return Response.json({error: '未登录'}, {status: 401});
  }
  const form = await request.formData();
  const action = String(form.get('action') ?? '');
  try {
    if (action === 'create') {
      const name = String(form.get('name') ?? '').trim();
      const icon = form.get('icon');
      if (!name || !(icon instanceof File) || icon.size === 0) {
        throw new Error('需要名称和图标');
      }
      addApp(name, icon.name, new Uint8Array(await icon.arrayBuffer()));
    } else if (action === 'version') {
      const appId = String(form.get('appId') ?? '');
      const label = String(form.get('label') ?? '').trim();
      const file = form.get('file');
      if (!appId || !label || !(file instanceof File) || file.size === 0) {
        throw new Error('需要版本标注和安装包');
      }
      addVersion(appId, label, file.name, new Uint8Array(await file.arrayBuffer()));
    } else if (action === 'delete-app') {
      removeApp(String(form.get('appId') ?? ''));
    } else if (action === 'delete-version') {
      removeVersion(String(form.get('appId') ?? ''), String(form.get('versionId') ?? ''));
    } else {
      throw new Error('未知操作');
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '保存失败';
    return new Response(null, {status: 303, headers: {location: `/admin/?err=${encodeURIComponent(message)}`}});
  }
  return new Response(null, {status: 303, headers: {location: '/admin/'}});
};
