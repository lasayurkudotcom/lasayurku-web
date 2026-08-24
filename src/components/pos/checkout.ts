import type { APIRoute } from 'astro';
import { createOrder, WooCommerceApiError } from '../../../../lib/woocommerce'; // Sesuaikan path import

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();

        if (!Array.isArray(body?.line_items) || body.line_items.length === 0) {
            return new Response(JSON.stringify({ message: 'Keranjang kasir kosong.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Buat order dengan status langsung completed untuk transaksi kasir
        const orderPayload = {
            status: 'completed',
            payment_method: body.payment_method || 'cod',
            payment_method_title: body.payment_method_title || 'Tunai (Kasir)',
            set_paid: true, // Otomatis tandai Lunas
            billing: body.billing || {
                first_name: 'Kasir',
                last_name: 'Offline',
                address_1: 'Toko La Sayurku',
                city: 'Bandung',
            },
            line_items: body.line_items,
            customer_note: body.customer_note || 'Transaksi Kasir Offline',
            meta_data: body.meta_data || [] // <-- AMBIL DATA META DARI POSAPP REACT
        };

        const order = await createOrder(orderPayload);

        return new Response(JSON.stringify(order), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('[POS Checkout API Error]:', err);

        // WAJIB kembalikan Response agar client tidak menggantung (Status 524)
        return new Response(
            JSON.stringify({
                message: err instanceof WooCommerceApiError ? err.message : err.message || 'Gagal memproses transaksi kasir.'
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};