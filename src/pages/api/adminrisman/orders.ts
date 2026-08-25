import type { APIRoute } from 'astro';

export const prerender = false;

const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

function getAuthHeader(): string | null {
  if (!CONSUMER_KEY || !CONSUMER_SECRET) return null;
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

// Data fallback jika WooCommerce tidak terkonfigurasi atau gagal connect (mode demo)
let MOCK_ORDERS_ALL = [
  {
    id: 10498,
    number: 'WEB-10498',
    status: 'pending',
    date_created: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    customer_name: 'Ibu Siti Aminah',
    phone: '0811-2233-4455',
    address: 'Jl. Casablanca Raya No. 45, Jakarta Selatan',
    delivery_type: '🚚 Kurir Express',
    payment_method_title: 'Transfer Bank Mandiri',
    customer_note: 'Tolong konfirmasi setelah menerima pembayaran.',
    total: '95000',
    meta_data: [],
    line_items: [
      { id: 1, name: 'Bayam Hijau Segar', quantity: 2, total: '7000' },
      { id: 2, name: 'Wortel Lokal Organik', quantity: 1, total: '8000' },
      { id: 3, name: 'Alpukat Mentega Super', quantity: 2, total: '56000' },
      { id: 4, name: 'Tahu Putih Segar', quantity: 4, total: '24000' },
    ],
  },
  {
    id: 10497,
    number: 'WEB-10497',
    status: 'on-hold',
    date_created: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    customer_name: 'Bpk. Rudi Santoso',
    phone: '0856-7788-9900',
    address: 'Jl. Tebet Barat Dalam Raya No. 12, Jakarta Selatan',
    delivery_type: '🚚 Pengiriman Reguler',
    payment_method_title: 'QRIS (Belum Dikonfirmasi)',
    customer_note: '',
    total: '73500',
    meta_data: [],
    line_items: [
      { id: 5, name: 'Kangkung Hidroponik', quantity: 3, total: '12000' },
      { id: 6, name: 'Tomat Merah Fresh', quantity: 2, total: '15000' },
      { id: 7, name: 'Beras Pandan Wangi 5kg', quantity: 1, total: '46500' },
    ],
  },
  {
    id: 10495,
    number: 'POS-10495',
    status: 'processing',
    date_created: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    customer_name: 'Bpk. Hendra Pratama',
    phone: '0812-3456-7890',
    address: 'Jl. Mampang Prapatan No. 88, Jakarta',
    delivery_type: '🛒 Kasir POS Direct',
    payment_method_title: 'Tunai (Lunas)',
    customer_note: 'Minta dipisahkan kantong plastik untuk daging sapi & sayuran.',
    total: '112000',
    meta_data: [],
    line_items: [
      { id: 8, name: 'Bayam Hijau Segar', quantity: 2, total: '7000' },
      { id: 9, name: 'Wortel Lokal Organik', quantity: 1, total: '8000' },
      { id: 10, name: 'Daging Sapi Sirloin Fresh', quantity: 1, total: '65000' },
      { id: 11, name: 'Alpukat Mentega Super', quantity: 1, total: '28000' },
    ],
  },
  {
    id: 10494,
    number: 'WEB-88231',
    status: 'completed',
    date_created: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    customer_name: 'Ibu Ratna Pertiwi',
    phone: '0819-8765-4321',
    address: 'Jl. Pondok Indah No. 7, Jakarta Selatan',
    delivery_type: '🚚 Kurir Express Instant',
    payment_method_title: 'QRIS Instant',
    customer_note: 'Tolong kirim sebelum jam 12 siang. Pastikan sayur masih segar.',
    total: '86500',
    meta_data: [{ key: 'packing_status', value: 'packed' }],
    line_items: [
      { id: 12, name: 'Kangkung Hidroponik', quantity: 3, total: '12000' },
      { id: 13, name: 'Tomat Merah Fresh', quantity: 2, total: '15000' },
      { id: 14, name: 'Cabai Rawit Merah Super', quantity: 1, total: '18000' },
      { id: 15, name: 'Beras Pandan Wangi 5kg', quantity: 1, total: '41500' },
    ],
  },
];

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const targetOrderId = body.orderId || body.order_id;
    const targetStatus = body.status || 'processing';
    const meta_data = body.meta_data;

    if (!targetOrderId) {
      return new Response(JSON.stringify({ success: false, message: 'Missing orderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authHeader = getAuthHeader();
    const base = WC_URL ? WC_URL.replace(/\/$/, '') : '';

    // 1. Jika terhubung ke WooCommerce Asli
    if (base && authHeader) {
      try {
        const wcRes = await fetch(`${base}/wp-json/wc/v3/orders/${targetOrderId}`, {
          method: 'PUT',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: targetStatus, meta_data: meta_data }),
        });

        if (!wcRes.ok) {
          let errMsg = 'Gagal update di WooCommerce';
          try { const errData = await wcRes.json(); errMsg = errData.message || errMsg; } catch (e) {}
          throw new Error(errMsg);
        }

        const updatedOrder = await wcRes.json();
        return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        console.warn('[API Admin Orders POST] WC Update failed, updating mock fallback. Error:', err.message);
      }
    }

    // 2. Fallback Update ke Data Mock
    const numericId = Number(targetOrderId);
    const mockOrder = MOCK_ORDERS_ALL.find(o => o.id === numericId);
    if (mockOrder) {
      mockOrder.status = targetStatus;
      if (meta_data) mockOrder.meta_data = [...mockOrder.meta_data, ...meta_data];
    }

    return new Response(JSON.stringify({ success: true, order: mockOrder || { id: targetOrderId, status: targetStatus } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API Admin Orders POST] Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const statusParam = url.searchParams.get('status') || 'processing';
    const statuses = statusParam === 'all'
      ? ['pending', 'on-hold', 'processing', 'completed']
      : statusParam.split(',').map(s => s.trim()).filter(Boolean);

    const authHeader = getAuthHeader();
    const base = WC_URL ? WC_URL.replace(/\/$/, '') : '';

    if (base && authHeader) {
      try {
        const allOrders = [];
        for (const s of statuses) {
          const wcRes = await fetch(`${base}/wp-json/wc/v3/orders?status=${s}&per_page=50`, {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          });

          if (!wcRes.ok) continue; // Skip jika status tertentu gagal, coba status lainnya

          const wcOrders = await wcRes.json();
          if (Array.isArray(wcOrders)) allOrders.push(...wcOrders);
        }

        const mappedOrders = allOrders.map((o: any) => ({
          id: o.id,
          number: `#${o.number}`,
          status: o.status,
          date_created: o.date_created,
          customer_name: `${o.billing?.first_name || 'Pelanggan'} ${o.billing?.last_name || ''}`.trim(),
          phone: o.billing?.phone || o.shipping?.phone || '081200000000',
          address: o.shipping?.address_1 || o.billing?.address_1 || '-', // PENGAMBILAN ALAMAT DARI WC
          delivery_type: o.payment_method === 'cash' ? '🛒 Kasir POS Direct' : '🚚 Kurir Express',
          payment_method_title: o.payment_method_title || 'Lunas',
          payment_method: o.payment_method || '',
          customer_note: o.customer_note || '',
          total: o.total,
          line_items: (o.line_items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            total: item.total,
          })),
          meta_data: o.meta_data || [],
        }));

        return new Response(
          JSON.stringify({ success: true, orders: mappedOrders }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.warn('[api/admin/orders] WC Fetch failed, using fallback demo data.');
      }
    }

    // Fallback response for demo / dev environment
    const filteredMock = MOCK_ORDERS_ALL.filter(o => statuses.includes(o.status));
    return new Response(
      JSON.stringify({ success: true, mode: 'demo', orders: filteredMock }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: err.message || 'Gagal mengambil data pesanan.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};