import { useEffect, useMemo, useState } from 'react';
import Login from './components/Login.jsx';
import Gallery from './components/Gallery.jsx';
import AddMovie from './components/AddMovie.jsx';
import { getSession, logout, getMovies } from './lib/api.js';

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [moviesError, setMoviesError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getSession()
      .then((res) => setAuthed(res.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    getMovies()
      .then((res) => setMovies(res.movies))
      .catch((err) => setMoviesError(err.message))
      .finally(() => setLoadingMovies(false));
  }, [authed]);

  const ownedIds = useMemo(() => new Set(movies.map((m) => m.imdb_id)), [movies]);

  if (authed === null) {
    return (
      <main className="app">
        <h1>🎬 Blu-ray Collection Tracker</h1>
      </main>
    );
  }

  if (!authed) {
    return <Login onLoggedIn={() => setAuthed(true)} />;
  }

  async function handleLogout() {
    await logout().catch(() => {});
    setAuthed(false);
  }

  function handleAdded(movie) {
    setMovies((prev) => [movie, ...prev]);
    setShowAdd(false);
  }

  function handleDeleted(id) {
    setMovies((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>🎬 Blu-ray Collection Tracker</h1>
        <div className="app-header-actions">
          <button type="button" onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? 'Close' : '+ Add movie'}
          </button>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      {showAdd && <AddMovie ownedIds={ownedIds} onAdded={handleAdded} />}
      <Gallery
        movies={movies}
        loading={loadingMovies}
        error={moviesError}
        onDeleted={handleDeleted}
      />
    </main>
  );
}
