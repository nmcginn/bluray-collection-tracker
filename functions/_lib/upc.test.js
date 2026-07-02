import { describe, it, expect, afterEach, vi } from 'vitest';
import { lookupBarcode, cleanProductTitle, isValidBarcode, UpcError } from './upc.js';

function mockFetch(body, init = {}) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status: 200, ...init }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isValidBarcode', () => {
  it('accepts UPC/EAN digit strings (8-14 digits)', () => {
    expect(isValidBarcode('12345678')).toBe(true); // EAN-8
    expect(isValidBarcode('085391163926')).toBe(true); // UPC-A
    expect(isValidBarcode('9780201379624')).toBe(true); // EAN-13
  });

  it('rejects everything else', () => {
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('123456789012345')).toBe(false);
    expect(isValidBarcode('12345678a')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
    expect(isValidBarcode(12345678)).toBe(false);
  });
});

describe('cleanProductTitle', () => {
  it('strips packaging noise so the name works as an OMDb query', () => {
    expect(cleanProductTitle('The Matrix (Blu-ray) (Widescreen)')).toBe('The Matrix');
    expect(cleanProductTitle('Heat [4K UHD + Digital Copy]')).toBe('Heat');
    expect(cleanProductTitle('Blade Runner: Director\'s Cut Blu-ray')).toBe('Blade Runner');
    expect(cleanProductTitle('Inception 2-Disc Special Edition DVD Combo Pack')).toBe(
      'Inception'
    );
  });

  it('handles empty and null input', () => {
    expect(cleanProductTitle('')).toBe('');
    expect(cleanProductTitle(null)).toBe('');
  });

  it('leaves ordinary titles alone', () => {
    expect(cleanProductTitle('12 Angry Men')).toBe('12 Angry Men');
  });
});

describe('lookupBarcode', () => {
  it('uses the keyless trial endpoint when no key is configured', async () => {
    const spy = mockFetch({ code: 'OK', items: [{ title: 'Heat (Blu-ray)', brand: 'WB' }] });

    const product = await lookupBarcode({}, '085391163926');
    expect(product).toEqual({ title: 'Heat (Blu-ray)', brand: 'WB' });

    const [url, opts] = spy.mock.calls[0];
    expect(String(url)).toContain('/prod/trial/lookup');
    expect(String(url)).toContain('upc=085391163926');
    expect(opts.headers.user_key).toBeUndefined();
  });

  it('uses the paid endpoint with headers when a key is configured', async () => {
    const spy = mockFetch({ code: 'OK', items: [{ title: 'Heat' }] });

    await lookupBarcode({ UPC_PROVIDER_KEY: 'secret' }, '085391163926');

    const [url, opts] = spy.mock.calls[0];
    expect(String(url)).toContain('/prod/v1/lookup');
    expect(opts.headers.user_key).toBe('secret');
  });

  it('returns null when no product matches (empty items or 404)', async () => {
    mockFetch({ code: 'OK', items: [] });
    expect(await lookupBarcode({}, '00000000')).toBeNull();

    vi.restoreAllMocks();
    mockFetch({ code: 'INVALID_UPC' }, { status: 404 });
    expect(await lookupBarcode({}, '00000000')).toBeNull();
  });

  it('throws a rate-limit UpcError on 429', async () => {
    mockFetch({ code: 'EXCEED_LIMIT' }, { status: 429 });
    await expect(lookupBarcode({}, '085391163926')).rejects.toThrow(/rate limit/i);
  });

  it('wraps network failures and server errors in UpcError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('boom'));
    await expect(lookupBarcode({}, '085391163926')).rejects.toThrow(UpcError);

    vi.restoreAllMocks();
    mockFetch({}, { status: 500 });
    await expect(lookupBarcode({}, '085391163926')).rejects.toThrow(
      'Barcode lookup failed (500)'
    );
  });
});
