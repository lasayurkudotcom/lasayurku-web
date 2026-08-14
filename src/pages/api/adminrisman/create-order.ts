import type { APIRoute } from 'astro';
import { WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    const {
      customer_name = 'Pelanggan Toko (Walk-in)',
      customer_phone = '081200000000',
      line_items = [],
      payment_method = 'cash',
      payment_method_title = 'Tunai (Kasir)',
      discount_amount = 0,
      cash_paid = 0,
      change_amount = 0,
      cashier_name = 'Kasir Utama',
      notes = '',
    } = body;

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Keranjang belanja POS tidak boleh kosong.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

    // Check if WooCommerce environment variables are present
    const isWcConfigured = Boolean(WC_URL && CONSUMER_KEY && CONSUMER_SECRET);

    const orderPayload = {
      status: 'processing', // Default status processing agar otomatis terbaca tim Packing & Kurir
      set_paid: true,       // Langsung LUNAS karena dibayar di kasir
      payment_method,
      payment_method_title,
      billing: {
        first_name: customer_name,
        last_name: '(POS Walk-in)',
        address_1: 'Transaksi Kasir POS Direct Store',
        city: 'Kasir Offline',
        state: 'ID-JB',
        postcode: '40000',
        country: 'ID',
        email: 'kasir.pos@lasayurku.com',
        phone: customer_phone || '081200000000',
      },
      shipping: {
        first_name: customer_name,
        last_name: '(POS Walk-in)',
        address_1: 'Ambil Di Tempat / Kasir POS',
        city: 'Kasir Offline',
        state: 'ID-JB',
        postcode: '40000',
        country: 'ID',
      },
      line_items: line_items.map((item: { product_id: number; quantity: number }) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
      fee_lines: discount_amount > 0 ? [
        {
          name: 'Diskon Manual Kasir',
          total: `-${discount_amount}`,
          tax_class: '',
          tax_status: 'none'
        }
      ] : [],
      customer_note: `[POS TRANSAKSI KASIR]
Kasir: ${cashier_name}
Metode Pembayaran: ${payment_method_title}
Uang Dibayar: Rp ${cash_paid.toLocaleString('id-ID')}
Kembalian: Rp ${change_amount.toLocaleString('id-ID')}
Catatan: ${notes || 'Tidak ada catatan'}`,
    };

    if (isWcConfigured) {
      const url = new URL(`${WC_URL!.replace(/\/$/, '')}/wp-json/wc/v3/orders`);
      const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        let errorDetail = '';
        try {
          const errBody = await response.json();
          errorDetail = errBody.message || response.statusText;
        } catch {
          errorDetail = response.statusText;
        }
        throw new WooCommerceApiError(`WooCommerce API Error (${response.status}): ${errorDetail}`, response.status);
      }

      const createdOrder = await response.json();
      return new Response(
        JSON.stringify({
          success: true,
          order_id: createdOrder.id,
          order_number: createdOrder.number || createdOrder.id,
          date_created: createdOrder.date_created || new Date().toISOString(),
          status: createdOrder.status,
          total: createdOrder.total,
          message: 'Pesanan POS berhasil dibuat dan tersimpan ke WooCommerce!',
          data: createdOrder,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // Offline / Demo fallback response if WC keys are not yet configured in local env
      const mockOrderId = Math.floor(100000 + Math.random() * 900000);
      const mockOrderDate = new Date().toISOString();

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'demo',
          order_id: mockOrderId,
          order_number: `POS-${mockOrderId}`,
          date_created: mockOrderDate,
          status: 'processing',
          message: 'Pesanan POS berhasil diproses dalam mode lokal/demo.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('[api/admin/create-order] Error:', err);
    const message = err instanceof WooCommerceApiError ? err.message : 'Gagal memproses pesanan POS.';
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
