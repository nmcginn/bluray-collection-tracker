import { requireAuth } from '../../_lib/auth.js';
import { listMovies, insertMovie } from '../../_lib/db.js';
import { getByImdbId, OmdbError } from '../../_lib/omdb.js';

export async function onRequestGet(context) {
  const unauthorized = await requireAuth(context);
  if (unauthorized) return unauthorized;

  const { request, env } = context;
  const q = new URL(request.url).searchParams.get('q') || undefined;

  try {
    const movies = await listMovies(env, { q });
    return Response.json({ movies });
  } catch (err) {
    return Response.json({ error: 'Failed to load collection' }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const unauthorized = await requireAuth(context);
  if (unauthorized) return unauthorized;

  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const imdbId = body && body.imdb_id;
  if (typeof imdbId !== 'string' || imdbId.trim() === '') {
    return Response.json({ error: 'imdb_id is required' }, { status: 400 });
  }

  let details;
  try {
    details = await getByImdbId(env, imdbId.trim());
  } catch (err) {
    if (err instanceof OmdbError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    return Response.json({ error: 'Failed to fetch movie details' }, { status: 500 });
  }

  try {
    const movie = await insertMovie(env, details);
    return Response.json({ movie }, { status: 201 });
  } catch (err) {
    if (err.code === 'DUPLICATE') {
      return Response.json(
        { error: 'Already in your collection', movie: err.existing },
        { status: 409 }
      );
    }
    return Response.json({ error: 'Failed to save movie' }, { status: 500 });
  }
}
