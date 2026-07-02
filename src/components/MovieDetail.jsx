import { useEffect } from 'react';

function formatAdded(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export default function MovieDetail({ movie, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const added = formatAdded(movie.added_at);

  const facts = [
    ['Genre', movie.genre],
    ['Director', movie.director],
    ['Cast', movie.actors],
    ['IMDb rating', movie.imdb_rating && `${movie.imdb_rating} / 10`],
    ['Barcode', movie.barcode],
    ['Added', added],
  ].filter(([, value]) => Boolean(value));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={movie.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="modal-body">
          <div className="movie-poster modal-poster">
            {movie.poster_url ? (
              <img src={movie.poster_url} alt={`${movie.title} poster`} />
            ) : (
              <div className="movie-poster-placeholder">No poster</div>
            )}
          </div>
          <div className="modal-info">
            <h2>{movie.title}</h2>
            <p className="movie-meta">
              {[movie.year, movie.rated, movie.runtime].filter(Boolean).join(' · ')}
            </p>
            {movie.plot && <p className="modal-plot">{movie.plot}</p>}
            <dl className="modal-facts">
              {facts.map(([label, value]) => (
                <div key={label} className="modal-fact">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
