import type { APIRoute } from 'astro';

export const prerender = false;

/** Deteksi role dari username/nicename sebagai fallback andal */
function detectRoleFromNicename(nicename: string | undefined | null): string | null {
  if (!nicename) return null;
  const lower = nicename.toLowerCase();
  if (lower.includes('kurir')) return 'kurir';
  if (lower.includes('packing')) return 'packing';
  if (lower.includes('kasiroffline') || lower.includes('kasir_offline') || (lower.includes('kasir') && lower.includes('offline'))) {
    return 'kasir_offline';
  }
  if (lower.includes('kasir')) return 'kasir';
  if (lower.includes('admin')) return 'administrator';
  return null;
}

function cookieHeader(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; SameSite=Lax`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(JSON.stringify({ message: 'Username/Email dan password wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    if (!WC_URL) {
      return new Response(JSON.stringify({ message: 'Konfigurasi server tidak lengkap' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const base = WC_URL.replace(/\/$/, '');

    // 1. JWT Login untuk mendapatkan token
    const jwtRes = await fetch(`${base}/wp-json/jwt-auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!jwtRes.ok) {
      let errorMsg = 'Gagal masuk. Periksa kembali kredensial Anda.';
      try {
        const errorData = await jwtRes.json();
        errorMsg = errorData.message?.replace(/<[^>]*>?/gm, '') || errorMsg;
      } catch (e) {}
      return new Response(JSON.stringify({ message: errorMsg }), {
        status: jwtRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authData = await jwtRes.json();
    const token = authData.token;

    // 2. Ambil user_id dari JWT payload (base64 decode bagian kedua)
    let wpUserId: number | null = null;
    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
      wpUserId = payload?.data?.user?.id ? Number(payload.data.user.id) : null;
    } catch { /* ignore */ }

    // 3. Coba ambil roles via WP REST API dengan JWT token milik user itu sendiri
    let resolvedRole: string | null = null;
    
    if (token) {
      try {
        const userRes = await fetch(`${base}/wp-json/wp/v2/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          // roles array, e.g. ["administrator"] atau ["kasir"]
          const roles: string[] = userData.roles ?? [];
          if (roles.length > 0) {
            resolvedRole = roles[0]; // ambil role pertama
          }
        }
      } catch { /* non-critical */ }
    }

    // 4. Fallback: deteksi dari user_nicename / slug (sangat andal karena username = kasir, packing, kurir)
    if (!resolvedRole || resolvedRole === 'customer' || resolvedRole === 'subscriber') {
      const detected =
        detectRoleFromNicename(authData.user_nicename) ||
        detectRoleFromNicename(authData.user_display_name) ||
        detectRoleFromNicename(username.trim());
      if (detected) {
        resolvedRole = detected;
      } else if (username.toLowerCase() === 'risman') {
        // khusus: username "risman" dianggap admin
        resolvedRole = 'administrator';
      }
    }

    // 5. Ambil WooCommerce customer ID by email
    let customerId: number | null = null;
    try {
      if (import.meta.env.WOOCOMMERCE_CONSUMER_KEY && import.meta.env.WOOCOMMERCE_CONSUMER_SECRET && authData.user_email) {
        const wcToken = Buffer.from(`${import.meta.env.WOOCOMMERCE_CONSUMER_KEY}:${import.meta.env.WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64');
        const customerRes = await fetch(
          `${base}/wp-json/wc/v3/customers?email=${encodeURIComponent(authData.user_email)}`,
          { headers: { Authorization: `Basic ${wcToken}`, 'Content-Type': 'application/json' } }
        );
        if (customerRes.ok) {
          const customers = await customerRes.json();
          if (Array.isArray(customers) && customers.length > 0) {
            customerId = customers[0].id;
          }
        }
      }
    } catch { /* non-critical */ }

    const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
    const roleForSession = resolvedRole || 'pelanggan';
    if (roleForSession !== 'pelanggan') {
      responseHeaders.append('Set-Cookie', cookieHeader('admin_token', token));
      responseHeaders.append('Set-Cookie', cookieHeader('auth_token', token));
      responseHeaders.append('Set-Cookie', cookieHeader('user_token', token));
      responseHeaders.append('Set-Cookie', cookieHeader('admin_user_role', roleForSession));
      responseHeaders.append('Set-Cookie', cookieHeader('user_role', roleForSession));
      responseHeaders.append('Set-Cookie', cookieHeader('user_nicename', authData.user_nicename || username));
    }

    return new Response(
      JSON.stringify({
        message: 'Berhasil masuk',
        token,
        user_email: authData.user_email,
        user_nicename: authData.user_nicename,
        user_display_name: authData.user_display_name,
        user_role: roleForSession,
        customer_id: customerId,
      }),
      { status: 200, headers: responseHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ message: error.message || 'Terjadi kesalahan pada server' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
