import type { APIRoute } from 'astro';
import { createOrder, WooCommerceApiError } from '../../lib/woocommerce';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

// Helper untuk memastikan customer_id adalah angka ID valid dari WooCommerce
async function resolveCustomerId(customerIdOrEmail: any, emailFallback?: string): Promise<number | undefined> {
  const target = customerIdOrEmail || emailFallback;
  if (!target) return undefined;

  // 1. Jika sudah berupa angka murni (misal 12)
  if (typeof target === 'number' && !isNaN(target) && target > 0) {
    return target;
  }
  if (typeof target === 'string' && /^\d+$/.test(target.trim())) {
    return Number(target.trim());
  }

  // 2. Jika berupa string email, cari ID pelanggannya ke WooCommerce REST API
  if (typeof target === 'string' && target.includes('@') && WC_URL && CONSUMER_KEY && CONSUMER_SECRET) {
    try {
      const base = WC_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/wp-json/wc/v3/customers?email=${encodeURIComponent(target.trim())}`, {
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const customers = await res.json();
        if (Array.isArray(customers) && customers.length > 0) {
          return Number(customers[0].id);
        }
      }
    } catch (err) {
      console.error('[checkout/resolveCustomerId] Error:', err);
    }
  }

  return undefined;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    if (!Array.isArray(body?.line_items) || body.line_items.length === 0) {
      return new Response(JSON.stringify({ message: 'Keranjang kosong.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body?.billing?.first_name || !body?.billing?.phone || !body?.billing?.address_1) {
      return new Response(JSON.stringify({ message: 'Data pengiriman belum lengkap.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Resolving ID pelanggan agar tidak bernilai NaN
    const finalCustomerId = await resolveCustomerId(body.customer_id, body.billing?.email);

    const orderPayload: any = {
      billing: body.billing,
      shipping: body.shipping || body.billing,
      line_items: body.line_items,
      customer_note: body.customer_note || '',
      payment_method: body.payment_method,
      payment_method_title: body.payment_method_title,
    };

    // Sertakan customer_id hanya jika ID valid ditemukan
    if (finalCustomerId && finalCustomerId > 0) {
      orderPayload.customer_id = finalCustomerId;
    }

    const order = await createOrder(orderPayload);

    return new Response(JSON.stringify(order), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof WooCommerceApiError ? err.message : 'Gagal memproses pesanan.';
    const status = err instanceof WooCommerceApiError && err.status ? err.status : 500;
    console.error('[api/checkout] error:', err);
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};