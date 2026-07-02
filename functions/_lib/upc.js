// UPC → product-title lookup via UPCitemdb (see PLAN.md). Kept behind this
// helper so the provider can be swapped without touching route handlers.
// The free trial endpoint needs no key; setting UPC_PROVIDER_KEY switches to
// the paid endpoint. A Blu-ray barcode only identifies the retail product, so
// callers still have to search OMDb with the (cleaned) product title.

const TRIAL_URL = 'https://api.upcitemdb.com/prod/trial/lookup';
const PAID_URL = 'https://api.upcitemdb.com/prod/v1/lookup';

export class UpcError extends Error {}

export function isValidBarcode(value) {
  return typeof value === 'string' && /^\d{8,14}$/.test(value);
}

// Retail product names are noisy ("The Matrix (Blu-ray) [4K UHD] Widescreen").
// Strip packaging/format words so the remainder works as an OMDb search term.
const NOISE_WORDS = new RegExp(
  '\\b(' +
    [
      'blu-?rays?',
      'dvds?',
      '4k',
      'uhd',
      'ultra hd',
      'hd',
      'digital( copy| code)?',
      'widescreen',
      'full ?screen',
      'steelbook',
      'combo( pack)?',
      'discs?',
      '\\d+-disc',
      '(special|collector\'?s?|limited|anniversary|extended|ultimate|deluxe|definitive) edition',
      'director\'?s? cut',
      'the movie',
      'new',
      'sealed',
      'region (free|[a-c1-9])',
      'ws',
      'dts',
    ].join('|') +
    ')\\b',
  'gi'
);

export function cleanProductTitle(raw) {
  if (!raw) return '';
  return raw
    .replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ' ') // parenthetical packaging notes
    .replace(NOISE_WORDS, ' ')
    .replace(/[/|+·•]+/g, ' ')
    .replace(/\s*[-–—:,]+\s*$/g, ' ') // trailing separators left after stripping
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Returns { title, brand } for the barcode, or null if the product is unknown.
export async function lookupBarcode(env, barcode) {
  const hasKey = Boolean(env.UPC_PROVIDER_KEY);
  const url = new URL(hasKey ? PAID_URL : TRIAL_URL);
  url.searchParams.set('upc', barcode);

  const headers = { Accept: 'application/json' };
  if (hasKey) {
    headers.user_key = env.UPC_PROVIDER_KEY;
    headers.key_type = '3scale';
  }

  let res;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new UpcError('Could not reach the barcode lookup service');
  }

  if (res.status === 429) {
    throw new UpcError('Barcode lookup rate limit reached — try again later');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  // UPCitemdb reports unknown barcodes with an empty items list (and sometimes
  // a 404 status); both just mean "no product found".
  if (data && Array.isArray(data.items) && data.items.length > 0) {
    const item = data.items[0];
    return { title: item.title || null, brand: item.brand || null };
  }
  if (res.ok || res.status === 404) {
    return null;
  }
  throw new UpcError(`Barcode lookup failed (${res.status})`);
}
