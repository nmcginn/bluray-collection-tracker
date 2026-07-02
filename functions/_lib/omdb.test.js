import { describe, it, expect, afterEach, vi } from 'vitest';
import { searchTitles, getByImdbId, OmdbError } from './omdb.js';

const ENV = { OMDB_API_KEY: 'k' };

function mockFetch(body, init = {}) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200, ...init }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchTitles', () => {
  it('throws when the API key is missing', async () => {
    await expect(searchTitles({}, 'heat')).rejects.toThrow(OmdbError);
  });

  it('maps results and normalizes N/A to null', async () => {
    mockFetch({
      Response: 'True',
      Search: [
        { imdbID: 'tt0133093', Title: 'The Matrix', Year: '1999', Poster: 'https://p/x.jpg' },
        { imdbID: 'tt0234215', Title: 'The Matrix Reloaded', Year: 'N/A', Poster: 'N/A' },
      ],
    });

    const results = await searchTitles(ENV, 'matrix');
    expect(results).toEqual([
      { imdb_id: 'tt0133093', title: 'The Matrix', year: '1999', poster_url: 'https://p/x.jpg' },
      { imdb_id: 'tt0234215', title: 'The Matrix Reloaded', year: null, poster_url: null },
    ]);
  });

  it('sends the query and key to OMDb', async () => {
    const spy = mockFetch({ Response: 'True', Search: [] });
    await searchTitles(ENV, 'heat');
    const url = new URL(spy.mock.calls[0][0]);
    expect(url.searchParams.get('s')).toBe('heat');
    expect(url.searchParams.get('apikey')).toBe('k');
    expect(url.searchParams.get('type')).toBe('movie');
  });

  it('returns [] for "Movie not found!"', async () => {
    mockFetch({ Response: 'False', Error: 'Movie not found!' });
    expect(await searchTitles(ENV, 'zzzz')).toEqual([]);
  });

  it('surfaces other OMDb errors', async () => {
    mockFetch({ Response: 'False', Error: 'Invalid API key!' });
    await expect(searchTitles(ENV, 'heat')).rejects.toThrow('Invalid API key!');
  });

  it('wraps network failures in OmdbError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('boom'));
    await expect(searchTitles(ENV, 'heat')).rejects.toThrow('Could not reach OMDb');
  });

  it('wraps non-2xx responses in OmdbError', async () => {
    mockFetch({}, { status: 503 });
    await expect(searchTitles(ENV, 'heat')).rejects.toThrow('OMDb request failed (503)');
  });
});

describe('getByImdbId', () => {
  it('maps full details into the movies-table shape', async () => {
    mockFetch({
      Response: 'True',
      imdbID: 'tt0113277',
      Title: 'Heat',
      Year: '1995',
      Rated: 'R',
      Runtime: '170 min',
      Genre: 'Action, Crime, Drama',
      Director: 'Michael Mann',
      Actors: 'Al Pacino, Robert De Niro',
      Plot: 'A group of high-end professional thieves...',
      Poster: 'N/A',
      imdbRating: '8.3',
    });

    const movie = await getByImdbId(ENV, 'tt0113277');
    expect(movie).toEqual({
      imdb_id: 'tt0113277',
      title: 'Heat',
      year: '1995',
      rated: 'R',
      runtime: '170 min',
      genre: 'Action, Crime, Drama',
      director: 'Michael Mann',
      actors: 'Al Pacino, Robert De Niro',
      plot: 'A group of high-end professional thieves...',
      poster_url: null,
      imdb_rating: '8.3',
    });
  });

  it('throws when the id is unknown', async () => {
    mockFetch({ Response: 'False', Error: 'Incorrect IMDb ID.' });
    await expect(getByImdbId(ENV, 'tt0000000')).rejects.toThrow('Incorrect IMDb ID.');
  });
});
