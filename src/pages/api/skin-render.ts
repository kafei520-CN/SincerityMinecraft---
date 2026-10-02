import type {APIRoute} from 'astro';
import {renderSkinOnGpu, renderStudioOnGpu} from '../../server/gpuRenderer';

export const prerender = false;

const POSES = new Set(['stand', 'walk', 'run', 'sit', 'wave', 'point', 'cheer']);

/** 把皮肤、姿势和胳膊模型交给服务器显卡做路径追踪。 */
export const POST: APIRoute = async ({request, url}) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({error: '请求不是 JSON'}, {status: 400});
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({error: '请求无效'}, {status: 400});
  }
  if ('meshes' in body && Array.isArray(body.meshes)) {
    if (body.meshes.length === 0 || body.meshes.length > 80) {
      return Response.json({error: '场景里没有可渲染的网格'}, {status: 400});
    }
    try {
      const png = await renderStudioOnGpu(body, url.origin);
      const bytes = new Uint8Array(png.byteLength);
      bytes.set(png);
      return new Response(bytes, {
        headers: {'content-type': 'image/png', 'cache-control': 'no-store'},
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '显卡渲染失败';
      return Response.json({error: message}, {status: 500});
    }
  }
  const skin = 'skin' in body && typeof body.skin === 'string' ? body.skin : '';
  const model = 'model' in body && body.model === 'slim' ? 'slim' : 'default';
  const pose = 'pose' in body && typeof body.pose === 'string' && POSES.has(body.pose) ? body.pose : 'stand';
  const samples = 'samples' in body && typeof body.samples === 'number' ? Math.max(8, Math.min(128, Math.round(body.samples))) : 128;
  if (!skin.startsWith('data:image/png')) {
    return Response.json({error: '请上传 png 皮肤'}, {status: 400});
  }
  if (skin.length > 2_000_000) {
    return Response.json({error: '皮肤文件太大'}, {status: 400});
  }
  const triangles = 'triangles' in body && Array.isArray(body.triangles)
    ? body.triangles.filter((value): value is number => typeof value === 'number').slice(0, 20000)
    : undefined;
  try {
    const png = await renderSkinOnGpu({
      skin,
      model,
      pose,
      samples,
      width: 768,
      height: 512,
      triangles,
      flipY: true,
    }, url.origin);
    const body = new Uint8Array(png.byteLength);
    body.set(png);
    return new Response(body, {
      headers: {'content-type': 'image/png', 'cache-control': 'no-store'},
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '显卡渲染失败';
    return Response.json({error: message}, {status: 500});
  }
};
