import type { APIRoute } from 'astro';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));

    if (!Array.isArray(body?.line_items) || body.line_items.length === 0) {
      return new Response(JSON.stringify({ message: 'Keranjang kasir kosong.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      return new Response(
        JSON.stringify({ message: 'Kredensial WooCommerce belum dikonfigurasi.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const base = WC_URL.replace(/\/$/, '');

    // Gunakan status 'processing' terlebih dahulu agar tidak memicu hook email berat secara bersamaan
    const orderPayload = {
      status: 'processing',
      payment_method: body.payment_method || 'pos_cash',
      payment_method_title: body.payment_method_title || 'Tunai Toko / POS',
      set_paid: true,
      billing: body.billing || {
        first_name: 'Kasir',
        last_name: 'POS',
        phone: '08000000000',
        address_1: 'Toko La Sayurku',
        city: 'Bandung',
        email: 'kasiroffline@lasayurku.com',
      },
      line_items: body.line_items,
      meta_data: [
        ...(body.meta_data || []),
        { key: '_is_pos_offline', value: 'yes' },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Batas 60 detik

    const res = await fetch(`${base}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          message: data?.message || `Gagal dari WooCommerce (HTTP ${res.status})`
        }),
        {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Eksekusi update status ke 'completed' di background (tanpa ditunggu/async) agar respon ke kasir kilat
    fetch(`${base}/wp-json/wc/v3/orders/${data.id}`, {
      method: 'PUT',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed' }),
    }).catch((err) => console.error('[POS Async Complete Error]:', err));

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POS Checkout API Error]:', err);

    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout
      ? 'Koneksi ke WordPress/WooCommerce terlalu lambat (> 60 detik).'
      : (err?.message || 'Server error saat memproses transaksi kasir.');

    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};