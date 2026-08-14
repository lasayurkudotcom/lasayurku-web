import type { APIRoute } from 'astro';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

// Helper untuk mendapatkan Customer ID asli dari email jika ID tidak valid
async function resolveCustomerId(customerIdOrEmail: string, base: string): Promise<string | null> {
  // Jika sudah berupa angka ID (misal: "12")
  if (/^\d+$/.test(customerIdOrEmail)) {
    return customerIdOrEmail;
  }

  // Jika berupa Email, cari ID-nya ke WooCommerce
  try {
    const res = await fetch(`${base}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerIdOrEmail)}`, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (res.ok) {
      const customers = await res.json();
      if (Array.isArray(customers) && customers.length > 0) {
        return customers[0].id.toString();
      }
    }
  } catch (err) {
    console.error('Error resolving customer by email:', err);
  }
  return null;
}

// GET: Fetch customer profile details
export const GET: APIRoute = async ({ url }) => {
  const param = url.searchParams.get('customerId');

  if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    return new Response(JSON.stringify({ message: 'WooCommerce credentials not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const base = WC_URL.replace(/\/$/, '');
  const customerId = param ? await resolveCustomerId(param, base) : null;

  if (!customerId) {
    return new Response(JSON.stringify({ message: 'Data pelanggan tidak ditemukan.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(`${base}/wp-json/wc/v3/customers/${customerId}`, {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ message: 'Gagal mengambil data pelanggan dari WooCommerce.' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      billing: data.billing,
      shipping: data.shipping,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST: Update customer profile details
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { customerId: param, first_name, last_name, billing, shipping } = body;

    if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      return new Response(JSON.stringify({ message: 'WooCommerce credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = WC_URL.replace(/\/$/, '');
    const customerId = param ? await resolveCustomerId(param, base) : null;

    if (!customerId) {
      return new Response(JSON.stringify({ message: 'Data pelanggan tidak ditemukan.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateBody: any = {};
    if (first_name !== undefined) updateBody.first_name = first_name;
    if (last_name !== undefined) updateBody.last_name = last_name;
    if (billing) updateBody.billing = billing;
    if (shipping) updateBody.shipping = shipping;

    const res = await fetch(`${base}/wp-json/wc/v3/customers/${customerId}`, {
      method: 'PUT',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateBody),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.message ?? '';
      } catch { }
      return new Response(JSON.stringify({ message: `Gagal mengupdate: ${detail || res.statusText}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({
      success: true,
      id: data.id,
      billing: data.billing,
      shipping: data.shipping,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};