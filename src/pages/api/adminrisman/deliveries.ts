import type { APIRoute } from 'astro';
import { getProcessingOrders, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const WC_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

    if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
      throw new Error('Konfigurasi WooCommerce tidak ditemukan.');
    }

    // Ambil order dengan status processing, delivering, dan completed
    const statuses = ['processing', 'delivering', 'completed'];
    const allOrders = [];

    for (const status of statuses) {
      try {
        const wcOrders = await getProcessingOrders(50, status);
        allOrders.push(...wcOrders);
      } catch (err) {
        console.warn(`[deliveries API] Gagal fetch status ${status}`, err);
      }
    }

    const mappedOrders = allOrders.map((o) => {
      // Cari metadata kurir
      const getMeta = (key: string) => o.meta_data?.find(m => m.key === key)?.value || '';

      const proofImg = getMeta('_proof_image_url') || getMeta('_proof_base64');

      return {
        id: o.id,
        number: `ORD-${o.id}`,
        status: o.status,
        date_created: o.date_created,
        customer_name: `${o.billing?.first_name || 'Pelanggan'} ${o.billing?.last_name || ''}`.trim(),
        phone: o.billing?.phone || '081200000000',
        shipping_address: `${o.shipping?.address_1 || o.billing?.address_1 || ''} ${o.shipping?.city || o.billing?.city || ''}`.trim() || 'Alamat tidak tersedia',
        payment_method_title: o.payment_method_title || 'Lunas',
        customer_note: o.customer_note || '',
        total: o.total,
        line_items: (o.line_items || []).map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: 'pcs/pck',
          total: item.total,
        })),
        // Jika packing_status belum diisi di WooCommerce, default ke 'packed' agar muncul di Siap Ambil
        packing_status: getMeta('packing_status') || 'packed',
        _courier_assigned: getMeta('_courier_assigned'),
        _proof_image_url: proofImg,
        _delivered_at: getMeta('_delivered_at'),
      };
    });

    return new Response(
      JSON.stringify({ success: true, orders: mappedOrders }),
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