// Shared auth helpers: single-password login backed by a signed (HMAC),
// stateless session cookie. No accounts, no session store.

const COOKIE_NAME = 'session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + ((4 - (str.length % 4)) % 4),
    '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(data, secret) {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionCookie(secret) {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const data = toBase64Url(new TextEncoder().encode(payload));
  const sig = await sign(data, secret);
  return `${COOKIE_NAME}=${data}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

export async function isAuthenticated(request, secret) {
  if (!secret) return false;
  const value = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME];
  if (!value) return false;

  const [data, sig] = value.split('.');
  if (!data || !sig) return false;

  const expectedSig = await sign(data, secret);
  if (!timingSafeEqual(expectedSig, sig)) return false;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(data)));
    return typeof payload.exp === 'number' && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

export function passwordMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  // Pad to equal length first so the comparison itself is constant-time;
  // a length check up front would leak length via timing.
  const padded = candidate.padEnd(expected.length, '\0').slice(0, expected.length);
  return candidate.length === expected.length && timingSafeEqual(padded, expected);
}

// Call at the top of any data route. Returns a 401 Response to short-circuit
// the handler, or null if the request is authenticated.
export async function requireAuth(context) {
  const authed = await isAuthenticated(context.request, context.env.SESSION_SECRET);
  if (!authed) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
