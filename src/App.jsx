import { useEffect, useState } from 'react';

// Phase 0 placeholder: confirms the frontend is served and the API + D1 binding
// are reachable. Real UI (login, gallery, add/scan) arrives in later phases.
export default function App() {
  const [health, setHealth] = useState({ status: 'loading' });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setHealth({ status: 'error', error: String(err) }));
  }, []);

  return (
    <main className="app">
      <h1>🎬 Blu-ray Collection Tracker</h1>
      <p className="tagline">Scaffolding is up. Building out the collection next.</p>
      <section className="health">
        <h2>API health</h2>
        <pre>{JSON.stringify(health, null, 2)}</pre>
      </section>
    </main>
  );
}
