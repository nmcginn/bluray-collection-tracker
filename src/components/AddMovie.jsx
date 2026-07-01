import { useState } from 'react';
import { searchTitles, addMovie } from '../lib/api.js';

export default function AddMovie({ ownedIds, onAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState(null);

  async function handleSearch(e) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;

    setSearching(true);
    setError(null);
    try {
      const res = await searchTitles(term);
      setResults(res.results);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(imdbId) {
    setAddingId(imdbId);
    setError(null);
    try {
      const res = await addMovie(imdbId);
      onAdded(res.movie);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="add-movie">
      <form className="add-movie-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={searching || query.trim() === ''}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {results && results.length === 0 && (
        <p className="tagline">No results for "{query.trim()}".</p>
      )}

      {results && results.length > 0 && (
        <ul className="add-movie-results">
          {results.map((result) => {
            const owned = ownedIds.has(result.imdb_id);
            return (
              <li key={result.imdb_id} className="add-movie-result">
                <div className="movie-poster small">
                  {result.poster_url ? (
                    <img src={result.poster_url} alt={`${result.title} poster`} />
                  ) : (
                    <div className="movie-poster-placeholder">No poster</div>
                  )}
                </div>
                <div className="add-movie-result-info">
                  <p className="add-movie-result-title">{result.title}</p>
                  <p className="movie-meta">{result.year}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(result.imdb_id)}
                  disabled={owned || addingId === result.imdb_id}
                >
                  {owned ? 'Owned' : addingId === result.imdb_id ? 'Adding…' : 'Add'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
