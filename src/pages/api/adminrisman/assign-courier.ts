import type { APIRoute } from 'astro';
import { updateOrderStatus, WooCommerceApiError } from '../../../lib/woocommerce';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { orderId, courierName } = body;

    if (!orderId || !courierName) {
      return new Response(JSON.stringify({ message: 'Missing orderId or courierName' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Set status menjadi 'delivering' dan simpan nama kurir di meta_data
    const meta_data = [
      { key: '_courier_assigned', value: courierName }
    ];

    const updatedOrder = await updateOrderStatus(orderId, 'delivering', undefined, meta_data);

    return new Response(JSON.stringify({ success: true, order: updatedOrder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[API Assign Courier Error]:', error);
    return new Response(JSON.stringify({ message: error.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
