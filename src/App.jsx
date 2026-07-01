import { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import Gallery from './components/Gallery.jsx';
import { getSession, logout } from './lib/api.js';

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    getSession()
      .then((res) => setAuthed(res.authenticated))
      .catch(() => setAuthed(false));
  }, []);

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

  return (
    <main className="app">
      <header className="app-header">
        <h1>🎬 Blu-ray Collection Tracker</h1>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <Gallery />
    </main>
  );
}
