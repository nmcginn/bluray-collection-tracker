import { createSessionCookie, passwordMatches } from '../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.APP_PASSWORD || !env.SESSION_SECRET) {
    return Response.json({ error: 'Server is not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const password = body && body.password;
  if (typeof password !== 'string' || password.length === 0) {
    return Response.json({ error: 'Password is required' }, { status: 400 });
  }

  if (!passwordMatches(password, env.APP_PASSWORD)) {
    return Response.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const cookie = await createSessionCookie(env.SESSION_SECRET);
  return Response.json({ status: 'ok' }, { headers: { 'Set-Cookie': cookie } });
}
