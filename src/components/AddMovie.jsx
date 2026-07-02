import { lazy, Suspense, useState } from 'react';
import { searchTitles, addMovie, lookupBarcode } from '../lib/api.js';

// Lazy: the zxing decoder is ~400 kB and only needed once scanning starts.
const BarcodeScanner = lazy(() => import('./BarcodeScanner.jsx'));

export default function AddMovie({ ownedIds, onAdded }) {
  const [mode, setMode] = useState('search'); // 'search' | 'scan'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState(null);
  // Set after a scan; attached to the next add so a manual-search fallback
  // still records which disc was scanned.
  const [barcode, setBarcode] = useState(null);
  const [scanNote, setScanNote] = useState(null);

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

  async function handleScan(code) {
    setMode('search');
    setBarcode(code);
    setError(null);
    setResults(null);
    setScanNote(null);
    setLookingUp(true);
    try {
      const res = await lookupBarcode(code);
      setQuery(res.query);
      setResults(res.results);
      setScanNote(
        res.results.length > 0
          ? `Barcode ${code} matched “${res.product_title}”. Pick the right movie — the barcode is saved with it.`
          : `Barcode ${code} matched “${res.product_title}”, but no movies were found for “${res.query}”. Adjust the search — the barcode is saved with whatever you add.`
      );
    } catch (err) {
      const info = err.body || {};
      setQuery(info.query || '');
      setScanNote(
        `${err.message}. Search by title instead — barcode ${code} is saved with whatever you add.`
      );
    } finally {
      setLookingUp(false);
    }
  }

  function clearBarcode() {
    setBarcode(null);
    setScanNote(null);
  }

  async function handleAdd(imdbId) {
    setAddingId(imdbId);
    setError(null);
    try {
      const res = await addMovie(imdbId, barcode);
      clearBarcode();
      onAdded(res.movie);
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <section className="add-movie">
      <div className="add-movie-modes">
        <button
          type="button"
          className={mode === 'search' ? 'active' : ''}
          onClick={() => setMode('search')}
        >
          Search by title
        </button>
        <button
          type="button"
          className={mode === 'scan' ? 'active' : ''}
          onClick={() => setMode('scan')}
        >
          Scan barcode
        </button>
      </div>

      {mode === 'scan' ? (
        <Suspense fallback={<p className="tagline">Loading scanner…</p>}>
          <BarcodeScanner onScan={handleScan} />
        </Suspense>
      ) : (
        <>
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

          {lookingUp && <p className="tagline">Looking up barcode…</p>}
          {scanNote && <p className="tagline">{scanNote}</p>}
          {barcode && (
            <p className="add-movie-barcode">
              Barcode {barcode} attached{' '}
              <button type="button" onClick={clearBarcode}>
                Remove
              </button>
            </p>
          )}
          {error && <p className="error">{error}</p>}

          {results && results.length === 0 && !scanNote && (
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
        </>
      )}
    </section>
  );
}
