import { useMemo, useState } from 'react';
import { deleteMovie } from '../lib/api.js';
import MovieDetail from './MovieDetail.jsx';

const SORTS = {
  added: (a, b) => (b.added_at || '').localeCompare(a.added_at || '') || b.id - a.id,
  title: (a, b) => a.title.localeCompare(b.title),
  // Year strings come from OMDb ("1999"); newest first, unknown years last.
  year: (a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0),
};

export default function Gallery({ movies, loading, error, onDeleted }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [genre, setGenre] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [selected, setSelected] = useState(null);

  const genres = useMemo(() => {
    const set = new Set();
    for (const movie of movies) {
      for (const g of (movie.genre || '').split(',')) {
        const name = g.trim();
        if (name) set.add(name);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return movies
      .filter((movie) => !term || movie.title.toLowerCase().includes(term))
      .filter((movie) => !genre || (movie.genre || '').includes(genre))
      .sort(SORTS[sortBy]);
  }, [movies, query, genre, sortBy]);

  async function handleDelete(movie) {
    if (!window.confirm(`Remove "${movie.title}" from your collection?`)) return;

    setDeletingId(movie.id);
    setDeleteError(null);
    try {
      await deleteMovie(movie.id);
      setSelected((current) => (current && current.id === movie.id ? null : current));
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
        <div className="gallery-toolbar">
          <input
            type="search"
            className="gallery-search"
            placeholder="Search your collection…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort by"
          >
            <option value="added">Recently added</option>
            <option value="title">Title A–Z</option>
            <option value="year">Year (newest)</option>
          </select>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      )}

      {(error || deleteError) && <p className="error">{error || deleteError}</p>}

      {movies.length === 0 ? (
        <p className="tagline">No movies yet — add one to get started.</p>
      ) : shown.length === 0 ? (
        <p className="tagline">No movies match your filters.</p>
      ) : (
        <div className="gallery-grid">
          {shown.map((movie) => (
            <article key={movie.id} className="movie-card">
              <button
                type="button"
                className="movie-card-open"
                onClick={() => setSelected(movie)}
                aria-label={`Details for ${movie.title}`}
              >
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
              </button>
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

      {selected && <MovieDetail movie={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
