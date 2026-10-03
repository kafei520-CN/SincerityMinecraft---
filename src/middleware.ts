import {defineMiddleware} from 'astro:middleware';
import {clientIp, touchVisitor} from './server/presence';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (!path.startsWith('/_') && !path.startsWith('/favicon')) {
    let fallback = '';
    try {
      fallback = context.clientAddress;
    } catch {
      fallback = '';
    }
    const ip = clientIp(context.request, fallback);
    touchVisitor({
      ip,
      path,
      ua: context.request.headers.get('user-agent') ?? '',
      rendering: path.includes('skin-render'),
    });
  }
  return next();
});
