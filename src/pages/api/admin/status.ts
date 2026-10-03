import type {APIRoute} from 'astro';
import {requireAdmin} from '../../../server/auth';
import {gpuStatus} from '../../../server/gpuRenderer';
import {listVisitors, renderSessions} from '../../../server/presence';

export const prerender = false;

export const GET: APIRoute = async ({request}) => {
  if (!requireAdmin(request)) {
    return Response.json({error: '未登录'}, {status: 401});
  }
  return Response.json({
    visitors: listVisitors(),
    renders: renderSessions(),
    gpu: gpuStatus(),
  });
};
