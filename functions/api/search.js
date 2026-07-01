import { requireAuth } from '../_lib/auth.js';
import { searchTitles, OmdbError } from '../_lib/omdb.js';

export async function onRequestGet(context) {
  const unauthorized = await requireAuth(context);
  if (unauthorized) return unauthorized;

  const { request, env } = context;
  const title = new URL(request.url).searchParams.get('title');
  if (!title || !title.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  try {
    const results = await searchTitles(env, title.trim());
    return Response.json({ results });
  } catch (err) {
    if (err instanceof OmdbError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return Response.json({ error: 'Search failed' }, { status: 500 });
  }
}
