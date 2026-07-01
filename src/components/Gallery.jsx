import { useEffect, useMemo, useState } from 'react';
import { getMovies, deleteMovie } from '../lib/api.js';

export default function Gallery() {
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    getMovies()
      .then((res) => setMovies(res.movies))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return movies;
    return movies.filter((movie) => movie.title.toLowerCase().includes(term));
  }, [movies, query]);

  async function handleDelete(movie) {
    if (!window.confirm(`Remove "${movie.title}" from your collection?`)) return;

    setDeletingId(movie.id);
    setError(null);
    try {
      await deleteMovie(movie.id);
      setMovies((prev) => prev.filter((m) => m.id !== movie.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <p className="tagline">Loading your collection…</p>;
  }

  return (
    <section className="gallery">
      {movies.length > 0 && (
        <input
          type="search"
          className="gallery-search"
          placeholder="Search your collection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {error && <p className="error">{error}</p>}

      {movies.length === 0 ? (
        <p className="tagline">No movies yet — add one to get started.</p>
      ) : filtered.length === 0 ? (
        <p className="tagline">No movies match "{query}".</p>
      ) : (
        <div className="gallery-grid">
          {filtered.map((movie) => (
            <article key={movie.id} className="movie-card">
              <div className="movie-poster">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={`${movie.title} poster`} />
                ) : (
                  <div className="movie-poster-placeholder">No poster</div>
                )}
              </div>
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <p className="movie-meta">
                  {[movie.year, movie.runtime].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                className="movie-delete"
                onClick={() => handleDelete(movie)}
                disabled={deletingId === movie.id}
              >
                {deletingId === movie.id ? 'Removing…' : 'Remove'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
