import type { APIRoute } from 'astro';
import { decodeHtml } from '../../lib/html';

const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

// In-memory Cache
let cachedData: { products: any[]; categories: any[] } | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 detik

// Fetch helper dengan timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const GET: APIRoute = async () => {
  const now = Date.now();

  // 1. Kirim Cache jika masih valid (< 60 detik)
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return new Response(JSON.stringify({ success: true, ...cachedData, source: 'cache' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  // Cek konfigurasi lingkungan
  if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    return new Response(JSON.stringify({ success: false, message: 'Kredensial WooCommerce API belum dikonfigurasi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = `Basic ${Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')}`;
  const baseWcUrl = WC_URL.replace(/\/$/, '');

  const productsUrl = `${baseWcUrl}/wp-json/wc/v3/products?_fields=id,name,price,regular_price,images,categories,stock_quantity,attributes,permalink&per_page=100&status=publish`;
  const categoriesUrl = `${baseWcUrl}/wp-json/wc/v3/products/categories?_fields=id,name,slug,parent,count&per_page=100&hide_empty=true`;

  try {
    // 2. Fetch produk & kategori secara paralel dengan timeout 10 detik
    const [productsRes, categoriesRes] = await Promise.all([
      fetchWithTimeout(productsUrl, { headers: { Authorization: authHeader } }),
      fetchWithTimeout(categoriesUrl, { headers: { Authorization: authHeader } }),
    ]);

    if (!productsRes.ok || !categoriesRes.ok) {
      throw new Error(`Koneksi WooCommerce Error: Products HTTP ${productsRes.status}, Categories HTTP ${categoriesRes.status}`);
    }

    const rawProducts = await productsRes.json();
    const rawCategories = await categoriesRes.json();

    // 3. Sanitasi, decode HTML, & standarisasi format properti
    const products = Array.isArray(rawProducts)
      ? rawProducts.map((p: any) => {
        // Cari atribut unit (misal: 100g, 1 ikat) jika ada
        const unitAttr = p.attributes?.find((a: any) => a.name.toLowerCase() === 'satuan' || a.name.toLowerCase() === 'unit');
        const unit = unitAttr ? unitAttr.options?.[0] : '1 pcs';

        return {
          id: p.id,
          name: decodeHtml(p.name || ''),
          price: Number(p.price || 0),
          regular_price: Number(p.regular_price || 0),
          img: p.images?.[0]?.src || '',
          stock: p.stock_quantity ?? 0,
          unit: unit,
          categories: Array.isArray(p.categories) ? p.categories.map((c: any) => c.slug) : [],
        };
      })
      : [];

    const categories = Array.isArray(rawCategories)
      ? rawCategories.map((c: any) => ({
        id: c.id,
        name: decodeHtml(c.name || ''),
        slug: c.slug,
        parent: c.parent || 0,
        count: c.count || 0,
      }))
      : [];

    // Simpan ke Cache
    cachedData = { products, categories };
    lastFetchTime = now;

    return new Response(JSON.stringify({ success: true, products, categories, source: 'api' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('[wc-products API] Error fetching WooCommerce data:', error);

    // 4. Stale fallback: Jika fetch gagal/timeout, pakai cachedData versi terakhir
    if (cachedData) {
      console.log('[wc-products API] Mengirim stale cache karena WooCommerce gagal/timeout.');
      return new Response(JSON.stringify({ success: true, ...cachedData, source: 'stale-fallback' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Gagal memuat produk dari WooCommerce.',
        error: error.message || error,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};