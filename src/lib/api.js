// Thin wrapper around fetch for the JSON API. Cookies are sent automatically
// (same-origin), so callers never touch the session token directly.
async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body (e.g. network-level failure already threw above).
  }

  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.body = body; // e.g. /api/lookup failures include barcode/product_title
    throw err;
  }

  return body;
}

export function getSession() {
  return request('/api/me');
}

export function login(password) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return request('/api/logout', { method: 'POST' });
}

export function getMovies() {
  return request('/api/movies');
}

export function deleteMovie(id) {
  return request(`/api/movies/${id}`, { method: 'DELETE' });
}

export function searchTitles(title) {
  return request(`/api/search?title=${encodeURIComponent(title)}`);
}

export function addMovie(imdbId, barcode = null) {
  return request('/api/movies', {
    method: 'POST',
    body: JSON.stringify({ imdb_id: imdbId, barcode }),
  });
}

export function lookupBarcode(barcode) {
  return request(`/api/lookup?barcode=${encodeURIComponent(barcode)}`);
}
