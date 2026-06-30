import { clearSessionCookie } from '../_lib/auth.js';

export async function onRequestPost() {
  return Response.json({ status: 'ok' }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
