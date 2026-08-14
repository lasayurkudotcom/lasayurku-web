import type { APIRoute } from 'astro';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export const GET: APIRoute = async () => {
  if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    return new Response(JSON.stringify({ categories: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const base = WC_URL.replace(/\/$/, '');

  try {
    const res = await fetch(`${base}/wp-json/wc/v3/products/categories?per_page=100`, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ categories: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ categories: Array.isArray(data) ? data : [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[POS Categories GET Error]:', err);
    return new Response(JSON.stringify({ categories: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};