// GET /api/health
// Phase 0 smoke test: confirms the function runs and the D1 binding (env.DB)
// is wired up. Later phases add the real routes under /api.
export async function onRequestGet(context) {
  const { env } = context;

  let db = 'unbound';
  if (env.DB) {
    try {
      const row = await env.DB.prepare('SELECT 1 AS ok').first();
      db = row && row.ok === 1 ? 'ok' : 'unexpected-result';
    } catch (err) {
      db = `error: ${err.message}`;
    }
  }

  return Response.json({
    status: 'ok',
    service: 'bluray-collection-tracker',
    db,
    time: new Date().toISOString(),
  });
}
