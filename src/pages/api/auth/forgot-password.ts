import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ message: 'Email dibutuhkan' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    if (!WC_URL) {
      return new Response(JSON.stringify({ message: 'Konfigurasi server tidak lengkap' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const base = WC_URL.replace(/\/$/, '');
    
    const formData = new URLSearchParams();
    formData.append('user_login', email);
    // Include some common fields to emulate browser behavior if needed, but user_login is enough

    const res = await fetch(`${base}/wp-login.php?action=lostpassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Link reset password telah dikirim ke email Anda' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Terjadi kesalahan saat memproses reset password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
