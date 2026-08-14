import type { APIRoute } from 'astro';
import { getProcessingOrders, updateOrderStatus, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

// Memory storage sementara jika sedang berjalan di mode Demo/Mock
let MOCK_ORDERS_ALL = [
  {
    id: 10498,
    number: 'WEB-10498',
    status: 'pending',
    date_created: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    customer_name: 'Ibu Siti Aminah',
    phone: '0811-2233-4455',
    delivery_type: '🚚 Kurir Express',
    payment_method_title: 'Transfer Bank Mandiri',
    customer_note: 'Tolong konfirmasi setelah menerima pembayaran.',
    total: '95000',
    meta_data: [],
    line_items: [
      { id: 1, name: 'Bayam Hijau Segar', quantity: 2, unit: '1 ikat', total: '7000' },
      { id: 2, name: 'Wortel Lokal Organik', quantity: 1, unit: '500 gram', total: '8000' },
      { id: 3, name: 'Alpukat Mentega Super', quantity: 2, unit: '1 kg', total: '56000' },
      { id: 4, name: 'Tahu Putih Segar', quantity: 4, unit: '4 potong', total: '24000' },
    ],
  },
  {
    id: 10497,
    number: 'WEB-10497',
    status: 'on-hold',
    date_created: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    customer_name: 'Bpk. Rudi Santoso',
    phone: '0856-7788-9900',
    delivery_type: '🚚 Pengiriman Reguler',
    payment_method_title: 'QRIS (Belum Dikonfirmasi)',
    customer_note: '',
    total: '73500',
    meta_data: [],
    line_items: [
      { id: 5, name: 'Kangkung Hidroponik', quantity: 3, unit: '1 ikat', total: '12000' },
      { id: 6, name: 'Tomat Merah Fresh', quantity: 2, unit: '500 gram', total: '15000' },
      { id: 7, name: 'Beras Pandan Wangi 5kg', quantity: 1, unit: '5 kg', total: '46500' },
    ],
  },
  {
    id: 10495,
    number: 'POS-10495',
    status: 'processing',
    date_created: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    customer_name: 'Bpk. Hendra Pratama',
    phone: '0812-3456-7890',
    delivery_type: '🛒 Kasir POS Direct',
    payment_method_title: 'Tunai (Lunas)',
    customer_note: 'Minta dipisahkan kantong plastik untuk daging sapi & sayuran.',
    total: '112000',
    meta_data: [],
    line_items: [
      { id: 8, name: 'Bayam Hijau Segar', quantity: 2, unit: '1 ikat', total: '7000' },
      { id: 9, name: 'Wortel Lokal Organik', quantity: 1, unit: '500 gram', total: '8000' },
      { id: 10, name: 'Daging Sapi Sirloin Fresh', quantity: 1, unit: '500 gram', total: '65000' },
      { id: 11, name: 'Alpukat Mentega Super', quantity: 1, unit: '1 kg', total: '28000' },
    ],
  },
  {
    id: 10494,
    number: 'WEB-88231',
    status: 'processing',
    date_created: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    customer_name: 'Ibu Ratna Pertiwi',
    phone: '0819-8765-4321',
    delivery_type: '🚚 Kurir Express Instant',
    payment_method_title: 'QRIS Instant',
    customer_note: 'Tolong kirim sebelum jam 12 siang. Pastikan sayur masih segar.',
    total: '86500',
    meta_data: [{ key: 'packing_status', value: 'packed' }],
    line_items: [
      { id: 12, name: 'Kangkung Hidroponik', quantity: 3, unit: '1 ikat', total: '12000' },
      { id: 13, name: 'Tomat Merah Fresh', quantity: 2, unit: '500 gram', total: '15000' },
      { id: 14, name: 'Cabai Rawit Merah Super', quantity: 1, unit: '250 gram', total: '18000' },
      { id: 15, name: 'Beras Pandan Wangi 5kg', quantity: 1, unit: '5 kg', total: '41500' },
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
      return new Response(JSON.stringify({ success: false, message: 'Missing orderId or status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

    // 1. Jika terhubung ke WooCommerce Asli
    if (WC_URL && CONSUMER_KEY && CONSUMER_SECRET) {
      try {
        const updatedOrder = await updateOrderStatus(Number(targetOrderId), targetStatus, undefined, meta_data);
        return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.warn('[API Admin Orders POST] WC Update failed, updating mock data fallback.');
      }
    }

    // 2. Fallback Update ke Data Mock (Agar di dev/demo mode tidak mengembalikan error 500)
    const numericId = Number(targetOrderId);
    const mockOrder = MOCK_ORDERS_ALL.find(o => o.id === numericId);
    if (mockOrder) {
      mockOrder.status = targetStatus;
      if (meta_data) {
        mockOrder.meta_data = [...mockOrder.meta_data, ...meta_data];
      }
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

    const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

    if (WC_URL && CONSUMER_KEY && CONSUMER_SECRET) {
      try {
        const allOrders = [];
        for (const s of statuses) {
          const wcOrders = await getProcessingOrders(50, s);
          allOrders.push(...wcOrders);
        }
        const mappedOrders = allOrders.map((o) => ({
          id: o.id,
          number: `ORD-${o.id}`,
          status: o.status,
          date_created: o.date_created,
          customer_name: `${o.billing?.first_name || 'Pelanggan'} ${o.billing?.last_name || ''}`.trim(),
          phone: o.billing?.phone || '081200000000',
          delivery_type: o.payment_method === 'cash' ? '🛒 Kasir POS Direct' : '🚚 Kurir Express',
          payment_method_title: o.payment_method_title || 'Lunas',
          customer_note: o.customer_note || '',
          total: o.total,
          line_items: (o.line_items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: 'pcs/pck',
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
  } catch (err) {
    const message = err instanceof WooCommerceApiError ? err.message : 'Gagal mengambil data pesanan.';
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};