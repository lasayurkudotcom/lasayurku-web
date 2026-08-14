import type { APIRoute } from 'astro';
import { updateOrderStatus, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderId, proofBase64, paymentMethod, codReceived } = body;

    if (!orderId) {
      return new Response(JSON.stringify({ message: 'Missing orderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deliveredAt = new Date().toISOString();
    const meta_data: any[] = [
      { key: '_delivered_at', value: deliveredAt },
      { key: '_is_delivered_by_courier', value: 'yes' },
    ];

    if (proofBase64) {
      meta_data.push({ key: '_proof_image_url', value: proofBase64 });
    }
    
    if (codReceived) {
      meta_data.push({ key: '_cod_received', value: codReceived });
    }

    const updatedOrder = await updateOrderStatus(orderId, 'completed', 'Pesanan telah selesai diantar oleh kurir.', meta_data);

    return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API Complete Delivery Error]:', error);
    return new Response(JSON.stringify({ message: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
