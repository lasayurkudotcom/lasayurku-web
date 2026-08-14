import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      return new Response(JSON.stringify({ message: 'Konfigurasi server tidak lengkap' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const url = new URL(`${WC_URL.replace(/\/$/, '')}/wp-json/wc/v3/customers`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName || '',
        last_name: lastName || '',
        username: email.split('@')[0],
      }),
    });

    if (!response.ok) {
      let errorMsg = 'Gagal mendaftar';
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {}
      return new Response(JSON.stringify({ message: errorMsg }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customerData = await response.json();

    return new Response(
      JSON.stringify({
        message: 'Registrasi berhasil',
        customer: {
          id: customerData.id,
          email: customerData.email,
          first_name: customerData.first_name,
          last_name: customerData.last_name,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ message: error.message || 'Terjadi kesalahan pada server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
