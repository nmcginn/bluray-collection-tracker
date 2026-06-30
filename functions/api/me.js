import { isAuthenticated } from '../_lib/auth.js';

// Lets the frontend check session status on load without hitting a data route.
export async function onRequestGet(context) {
  const { request, env } = context;
  const authenticated = await isAuthenticated(request, env.SESSION_SECRET);
  return Response.json({ authenticated });
}
