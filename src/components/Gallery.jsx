import { useMemo, useState } from 'react';
import { deleteMovie } from '../lib/api.js';

export default function Gallery({ movies, loading, error, onDeleted }) {
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return movies;
    return movies.filter((movie) => movie.title.toLowerCase().includes(term));
  }, [movies, query]);

  async function handleDelete(movie) {
    if (!window.confirm(`Remove "${movie.title}" from your collection?`)) return;

    setDeletingId(movie.id);
    setDeleteError(null);
    try {
      await deleteMovie(movie.id);
      onDeleted(movie.id);
    } catch (err) {
      setDeleteError(err.message);
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

      {(error || deleteError) && <p className="error">{error || deleteError}</p>}

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
