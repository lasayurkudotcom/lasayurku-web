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
  const requestedPerPage = Number(url.searchParams.get('per_page') || '20');
  const perPage = Number.isFinite(requestedPerPage)
    ? Math.min(Math.max(requestedPerPage, 1), 100) // Naikkan limit ke 100 agar load semua produk
    : 20;

  let wcApiUrl = `${base}/wp-json/wc/v3/products?_fields=id,name,price,regular_price,sale_price,stock_quantity,stock_status,images,categories,slug&per_page=${perPage}&status=publish`;
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

// FUNGSI PUT UNTUK UPDATE STOK (Ini yang sebelumnya hilang)
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const productId = body.id;
    const stockQuantity = Number(body.stock_quantity);

    if (!productId || isNaN(stockQuantity)) {
      return new Response(JSON.stringify({ message: 'ID Produk atau jumlah stok tidak valid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      return new Response(JSON.stringify({ message: 'Kredensial WooCommerce belum diatur' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = WC_URL.replace(/\/$/, '');
    const wcApiUrl = `${base}/wp-json/wc/v3/products/${productId}`;

    const res = await fetch(wcApiUrl, {
      method: 'PUT',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_quantity: stockQuantity,
        manage_stock: true // Wajib true agar WooCommerce mau update stoknya
      }),
    });

    if (!res.ok) {
      let errMsg = 'Gagal mengubah stok di WooCommerce';
      try {
        const errData = await res.json();
        errMsg = errData.message || errMsg;
      } catch (e) {}
      return new Response(JSON.stringify({ message: errMsg }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updatedProduct = await res.json();
    return new Response(JSON.stringify({ success: true, product: updatedProduct }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[POS Products PUT Error]:', err);
    return new Response(JSON.stringify({ message: err.message || 'Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};