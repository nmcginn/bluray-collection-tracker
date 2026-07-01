// Thin wrapper around the OMDb API. Called only from Worker code so the key
// never reaches the browser. See CLAUDE.md — OMDb can search/fetch by title
// or imdbID, but cannot resolve a UPC barcode.

const BASE_URL = 'https://www.omdbapi.com/';

export class OmdbError extends Error {}

function clean(value) {
  return value && value !== 'N/A' ? value : null;
}

async function callOmdb(env, params) {
  if (!env.OMDB_API_KEY) {
    throw new OmdbError('OMDb API key is not configured');
  }

  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', env.OMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new OmdbError('Could not reach OMDb');
  }
  if (!res.ok) {
    throw new OmdbError(`OMDb request failed (${res.status})`);
  }
  return res.json();
}

// Title search: returns lightweight candidates for the user to pick from.
export async function searchTitles(env, title) {
  const data = await callOmdb(env, { s: title, type: 'movie' });
  if (data.Response === 'False') {
    if (data.Error === 'Movie not found!') return [];
    throw new OmdbError(data.Error || 'OMDb search failed');
  }
  return (data.Search || []).map((item) => ({
    imdb_id: item.imdbID,
    title: item.Title,
    year: clean(item.Year),
    poster_url: clean(item.Poster),
  }));
}

// Full details for a single title, in the shape the `movies` table expects.
export async function getByImdbId(env, imdbId) {
  const data = await callOmdb(env, { i: imdbId, plot: 'short' });
  if (data.Response === 'False') {
    throw new OmdbError(data.Error || 'Movie not found');
  }
  return {
    imdb_id: data.imdbID,
    title: data.Title,
    year: clean(data.Year),
    rated: clean(data.Rated),
    runtime: clean(data.Runtime),
    genre: clean(data.Genre),
    director: clean(data.Director),
    actors: clean(data.Actors),
    plot: clean(data.Plot),
    poster_url: clean(data.Poster),
    imdb_rating: clean(data.imdbRating),
  };
}
