import { requireAuth } from '../_lib/auth.js';
import { lookupBarcode, cleanProductTitle, isValidBarcode, UpcError } from '../_lib/upc.js';
import { searchTitles, OmdbError } from '../_lib/omdb.js';

// Scan flow: barcode → UPC provider → product title → OMDb candidates.
// Failures always include the barcode (and product title when we got one) so
// the UI can fall back to a prefilled manual title search.
export async function onRequestGet(context) {
  const unauthorized = await requireAuth(context);
  if (unauthorized) return unauthorized;

  const { request, env } = context;
  const barcode = (new URL(request.url).searchParams.get('barcode') || '').trim();
  if (!isValidBarcode(barcode)) {
    return Response.json({ error: 'barcode must be 8-14 digits' }, { status: 400 });
  }

  let product;
  try {
    product = await lookupBarcode(env, barcode);
  } catch (err) {
    const message = err instanceof UpcError ? err.message : 'Barcode lookup failed';
    return Response.json({ error: message, barcode }, { status: 502 });
  }

  if (!product || !product.title) {
    return Response.json(
      { error: 'No product found for this barcode', barcode },
      { status: 404 }
    );
  }

  const query = cleanProductTitle(product.title);
  if (!query) {
    return Response.json(
      { error: 'Product name was unusable for a title search', barcode, product_title: product.title },
      { status: 404 }
    );
  }

  try {
    const results = await searchTitles(env, query);
    return Response.json({ barcode, product_title: product.title, query, results });
  } catch (err) {
    const message = err instanceof OmdbError ? err.message : 'Title search failed';
    return Response.json(
      { error: message, barcode, product_title: product.title, query },
      { status: 502 }
    );
  }
}
