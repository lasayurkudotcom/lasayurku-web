import type { APIRoute } from 'astro';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export const GET: APIRoute = async ({ url }) => {
  if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    return new Response(JSON.stringify({ products: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const base = WC_URL.replace(/\/$/, '');
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const perPage = url.searchParams.get('per_page') || '50';

  let wcApiUrl = `${base}/wp-json/wc/v3/products?per_page=${perPage}&status=publish`;
  if (search) wcApiUrl += `&search=${encodeURIComponent(search)}`;
  if (category) wcApiUrl += `&category=${category}`;

  try {
    const res = await fetch(wcApiUrl, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ products: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ products: Array.isArray(data) ? data : [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POS Products GET Error]:', err);
    return new Response(JSON.stringify({ products: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};