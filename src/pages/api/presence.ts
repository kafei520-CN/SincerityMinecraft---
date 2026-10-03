import type {APIRoute} from 'astro';
import {clientIp, touchVisitor} from '../../server/presence';

export const prerender = false;

export const POST: APIRoute = async ({request, clientAddress}) => {
  let body: {path?: string; rendering?: boolean} = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  touchVisitor({
    ip: clientIp(request, clientAddress ?? ''),
    path: typeof body.path === 'string' ? body.path : '/',
    rendering: Boolean(body.rendering),
    ua: request.headers.get('user-agent') ?? '',
  });
  return new Response(null, {status: 204});
};
