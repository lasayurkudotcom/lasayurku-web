// File: src/pages/api/adminrisman/pos/offline-sales.ts
import type { APIRoute } from 'astro';
// Sesuaikan path import WooCommerce API Anda di bawah ini:
// import { WooCommerce } from '../../../../lib/woocommerce'; 

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Data yang dikirim dari kasir (trxNo, items, total, dll)
    const { trxNo, items, total, paid, change, discount } = data;

    // Susun data untuk dikirim ke WooCommerce sebagai Order Offline
    const orderData = {
      payment_method: 'pos_offline',
      payment_method_title: 'Tunai Toko / POS',
      set_paid: true, // Langsung tandai sudah dibayar
      status: 'completed', // Langsung masuk status selesai
      billing: { 
        first_name: 'Pelanggan Toko', 
        last_name: `(TRX: ${trxNo})` 
      },
      line_items: items.map((item: any) => ({
        product_id: item.productId,
        quantity: item.qty
      })),
      // Catat kembalian dan diskon di meta data agar tercatat
      meta_data: [
        { key: '_pos_offline_trx', value: trxNo },
        { key: '_pos_paid_amount', value: paid },
        { key: '_pos_change_amount', value: change },
        { key: '_pos_discount_amount', value: discount }
      ]
    };

    // PANGGIL WOOCOMMERCE API DI SINI
    // Contoh:
    // const response = await WooCommerce.post('orders', orderData);
    
    // Jika sukses, kembalikan response ok
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Transaksi offline berhasil disimpan ke server' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Gagal menyimpan transaksi offline' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};