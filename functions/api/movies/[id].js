import { requireAuth } from '../../_lib/auth.js';
import { deleteMovie } from '../../_lib/db.js';

export async function onRequestDelete(context) {
  const unauthorized = await requireAuth(context);
  if (unauthorized) return unauthorized;

  const { params, env } = context;
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return Response.json({ error: 'Invalid id' }, { status: 400 });
  }

  const deleted = await deleteMovie(env, id);
  if (!deleted) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json({ status: 'ok' });
}
