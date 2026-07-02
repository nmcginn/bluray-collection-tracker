import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  passwordMatches,
  requireAuth,
} from './auth.js';

const SECRET = 'test-secret';

function requestWithCookie(setCookieHeader) {
  // Turn a Set-Cookie value ("session=x.y; Path=/; ...") into a request
  // carrying the equivalent Cookie header.
  const pair = setCookieHeader.split(';')[0];
  return new Request('https://example.test/api/movies', {
    headers: { Cookie: pair },
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('session cookie', () => {
  it('round-trips: a freshly issued cookie authenticates', async () => {
    const cookie = await createSessionCookie(SECRET);
    expect(cookie).toContain('HttpOnly');
    expect(await isAuthenticated(requestWithCookie(cookie), SECRET)).toBe(true);
  });

  it('rejects a tampered signature', async () => {
    const cookie = await createSessionCookie(SECRET);
    const tampered = cookie.replace(/session=([^;]+)/, (_, v) => {
      const flipped = v.endsWith('A') ? `${v.slice(0, -1)}B` : `${v.slice(0, -1)}A`;
      return `session=${flipped}`;
    });
    expect(await isAuthenticated(requestWithCookie(tampered), SECRET)).toBe(false);
  });

  it('rejects a cookie signed with a different secret', async () => {
    const cookie = await createSessionCookie('other-secret');
    expect(await isAuthenticated(requestWithCookie(cookie), SECRET)).toBe(false);
  });

  it('rejects an expired session', async () => {
    vi.useFakeTimers();
    const cookie = await createSessionCookie(SECRET);
    vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000); // past the 30-day TTL
    expect(await isAuthenticated(requestWithCookie(cookie), SECRET)).toBe(false);
  });

  it('rejects missing cookie, malformed value, and missing secret', async () => {
    const bare = new Request('https://example.test/');
    expect(await isAuthenticated(bare, SECRET)).toBe(false);
    expect(await isAuthenticated(requestWithCookie('session=garbage'), SECRET)).toBe(false);
    const cookie = await createSessionCookie(SECRET);
    expect(await isAuthenticated(requestWithCookie(cookie), undefined)).toBe(false);
  });

  it('clearSessionCookie expires the cookie immediately', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});

describe('requireAuth', () => {
  it('returns 401 for unauthenticated requests and null when authed', async () => {
    const env = { SESSION_SECRET: SECRET };
    const denied = await requireAuth({ request: new Request('https://example.test/'), env });
    expect(denied.status).toBe(401);

    const cookie = await createSessionCookie(SECRET);
    const allowed = await requireAuth({ request: requestWithCookie(cookie), env });
    expect(allowed).toBeNull();
  });
});

describe('passwordMatches', () => {
  it('accepts only the exact password', () => {
    expect(passwordMatches('hunter2', 'hunter2')).toBe(true);
    expect(passwordMatches('hunter3', 'hunter2')).toBe(false);
    expect(passwordMatches('hunter22', 'hunter2')).toBe(false);
    expect(passwordMatches('', 'hunter2')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(passwordMatches(undefined, 'hunter2')).toBe(false);
    expect(passwordMatches('hunter2', undefined)).toBe(false);
    expect(passwordMatches(42, 'hunter2')).toBe(false);
  });
});
