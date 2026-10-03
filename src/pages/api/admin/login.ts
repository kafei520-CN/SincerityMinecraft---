import type {APIRoute} from 'astro';
import {checkPassword, makeSession, sessionCookie} from '../../../server/auth';

export const prerender = false;

export const POST: APIRoute = async ({request}) => {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  if (!checkPassword(password)) {
    return new Response(null, {status: 303, headers: {location: '/admin/login/?bad=1'}});
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: '/admin/',
      'set-cookie': sessionCookie(makeSession()),
    },
  });
};
