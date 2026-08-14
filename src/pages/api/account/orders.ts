import type { APIRoute } from 'astro';
import { getOrdersByCustomer, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const customerId = url.searchParams.get('customerId');

  if (!customerId || isNaN(Number(customerId))) {
    return new Response(JSON.stringify({ message: 'Parameter customerId tidak valid.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const orders = await getOrdersByCustomer(Number(customerId));

    return new Response(JSON.stringify(orders), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof WooCommerceApiError ? err.message : 'Gagal memuat riwayat pesanan.';
    const status = err instanceof WooCommerceApiError && err.status ? err.status : 500;
    console.error('[api/account/orders] error:', err);
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
