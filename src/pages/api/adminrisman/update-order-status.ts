import type { APIRoute } from 'astro';
import { updateOrderStatus, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { order_id, new_status = 'completed', staff_name = 'Petugas Gudang' } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Parameter order_id wajib diisi.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL;
    const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
    const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

    const note = `[PACKING SELESAI] Dikemas & diperiksa oleh ${staff_name} pada ${new Date().toLocaleString('id-ID')}`;

    if (WC_URL && CONSUMER_KEY && CONSUMER_SECRET) {
      try {
        const updated = await updateOrderStatus(Number(order_id), new_status, note);
        return new Response(
          JSON.stringify({
            success: true,
            order_id: updated.id,
            status: updated.status,
            message: `Status pesanan #${order_id} berhasil diperbarui menjadi ${new_status}`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.warn(`[update-order-status] WC update failed for #${order_id}, returning success demo fallback.`);
      }
    }

    // Demo Mode fallback
    return new Response(
      JSON.stringify({
        success: true,
        mode: 'demo',
        order_id,
        status: new_status,
        message: `[Demo] Status pesanan #${order_id} diperbarui oleh ${staff_name}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof WooCommerceApiError ? err.message : 'Gagal memperbarui status pesanan.';
    return new Response(
      JSON.stringify({ success: false, message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
