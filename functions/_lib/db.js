// D1 helpers for the `movies` table. Thin wrappers over env.DB — no ORM.

const MOVIE_FIELDS = [
  'imdb_id',
  'title',
  'year',
  'rated',
  'runtime',
  'genre',
  'director',
  'actors',
  'plot',
  'poster_url',
  'imdb_rating',
  'barcode',
];

export async function listMovies(env, { q } = {}) {
  let query = 'SELECT * FROM movies';
  const params = [];
  if (q) {
    query += ' WHERE title LIKE ?';
    params.push(`%${q}%`);
  }
  query += ' ORDER BY added_at DESC';

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return results;
}

export async function insertMovie(env, movie) {
  const values = MOVIE_FIELDS.map((field) => movie[field] ?? null);
  const added_at = new Date().toISOString();
  const placeholders = MOVIE_FIELDS.map(() => '?').join(', ');

  try {
    const result = await env.DB.prepare(
      `INSERT INTO movies (${MOVIE_FIELDS.join(', ')}, added_at) VALUES (${placeholders}, ?)`
    ).bind(...values, added_at).run();

    return await env.DB.prepare('SELECT * FROM movies WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      const existing = await env.DB.prepare('SELECT * FROM movies WHERE imdb_id = ?')
        .bind(movie.imdb_id)
        .first();
      const dupErr = new Error('Already in your collection');
      dupErr.code = 'DUPLICATE';
      dupErr.existing = existing;
      throw dupErr;
    }
    throw err;
  }
}

export async function deleteMovie(env, id) {
  const result = await env.DB.prepare('DELETE FROM movies WHERE id = ?').bind(id).run();
  return result.meta.changes > 0;
}
