import type {APIRoute} from 'astro';
import {clearCookie} from '../../../server/auth';

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 303,
    headers: {location: '/admin/login/', 'set-cookie': clearCookie()},
  });
};
