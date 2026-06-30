import { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import { getSession, logout } from './lib/api.js';

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking
  const [health, setHealth] = useState({ status: 'loading' });

  useEffect(() => {
    getSession()
      .then((res) => setAuthed(res.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setHealth({ status: 'error', error: String(err) }));
  }, [authed]);

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
      <p className="tagline">Logged in. Collection gallery is up next.</p>
      <section className="health">
        <h2>API health</h2>
        <pre>{JSON.stringify(health, null, 2)}</pre>
      </section>
    </main>
  );
}
