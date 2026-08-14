import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, cartTotalPrice, clearCart } from '../stores/cart';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note: string;
}

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  note: '',
};

export default function CheckoutForm() {
  const items = useStore(cartItems);
  const totalPrice = useStore(cartTotalPrice);

  const [form, setForm] = useState<FormState>(initialForm);
  const [paymentMethod, setPaymentMethod] = useState<'bacs' | 'qris' | 'cod'>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => {
    // 1. Ambil token & identifier pengguna dari localStorage
    const token = localStorage.getItem('user_token') || localStorage.getItem('auth_token');
    const id = localStorage.getItem('user_id') || localStorage.getItem('user_email');

    if (id) {
      setCustomerId(id);
    }

    // Isikan email dari localStorage terlebih dahulu sebagai fallback instan
    const savedEmail = localStorage.getItem('user_email');
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }));
    }

    // 2. Jika ada token / identifier, panggil API profil untuk auto-fill
    if (token || id) {
      const param = id ? `?customerId=${encodeURIComponent(id)}` : '';
      fetch(`/api/wc-update-user${param}`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Gagal memuat profil');
          return res.json();
        })
        .then((data) => {
          if (data) {
            const billing = data.billing || {};
            setForm((prev) => ({
              ...prev,
              firstName: data.first_name || billing.first_name || prev.firstName,
              lastName: data.last_name || billing.last_name || prev.lastName,
              phone: billing.phone || prev.phone,
              email: data.email || billing.email || savedEmail || prev.email,
              address: billing.address_1 || prev.address,
              city: billing.city || prev.city,
            }));
          }
        })
        .catch((err) => console.error('Error auto-filling profile:', err));
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing: {
            first_name: form.firstName,
            last_name: form.lastName,
            address_1: form.address,
            city: form.city,
            email: form.email || `${form.phone}@lasayurku.com`, // Dummy email jika kosong agar lolos validasi Woo
            phone: form.phone,
          },
          line_items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          customer_note: form.note,
          payment_method: paymentMethod,
          payment_method_title: paymentMethod === 'bacs' ? 'Transfer Bank' : paymentMethod === 'qris' ? 'QRIS' : 'Bayar di Tempat (COD)',
          customer_id: customerId || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message ?? 'Gagal membuat pesanan. Silakan coba lagi.');
      }

      // Simpan alamat ke WooCommerce jika dicentang
      if (customerId && saveAddress) {
        try {
          await fetch('/api/wc-update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId,
              first_name: form.firstName,
              last_name: form.lastName,
              billing: {
                first_name: form.firstName,
                last_name: form.lastName,
                phone: form.phone,
                email: form.email || `${form.phone}@lasayurku.com`,
                address_1: form.address,
                city: form.city,
              },
              shipping: {
                first_name: form.firstName,
                last_name: form.lastName,
                phone: form.phone,
                address_1: form.address,
                city: form.city,
              }
            })
          });
        } catch (err) {
          console.error('Gagal menyimpan alamat:', err);
        }
      }

      clearCart();
      window.location.href = `/checkout/sukses?order=${result.id}`;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan tak terduga.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-brand/10 bg-white p-8 text-center">
        <p className="text-sm font-medium text-neutral-600">Keranjang Anda kosong.</p>
        <a
          href="/"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Mulai Belanja
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-5">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:col-span-3">
        <h2 className="mb-1 text-base font-bold text-neutral-800">Data Pengiriman</h2>

        <div className="grid grid-cols-2 gap-3">
          <input
            required
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Nama depan"
            className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
          <input
            required
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Nama belakang"
            className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <input
          required
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Nomor WhatsApp"
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        {/* Email input dihilangkan atas permintaan pengguna untuk menyederhanakan form */}
        <input
          required
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Alamat lengkap"
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <input
          required
          name="city"
          value={form.city}
          onChange={handleChange}
          placeholder="Kota"
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <textarea
          name="note"
          value={form.note}
          onChange={handleChange}
          placeholder="Catatan untuk kurir (opsional) — Misal: Rumah pagar hijau dekat Masjid Al-Jabbar"
          rows={3}
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm focus:border-brand focus:outline-none placeholder:text-neutral-400"
        />

        <h2 className="mt-4 mb-1 text-base font-bold text-neutral-800">Metode Pembayaran</h2>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-3 rounded-lg border border-brand/10 p-3 hover:bg-brand/10 cursor-pointer transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="bacs"
              checked={paymentMethod === 'bacs'}
              onChange={() => setPaymentMethod('bacs')}
              className="text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-neutral-700">Transfer Bank (BCA / Mandiri)</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-brand/10 p-3 hover:bg-brand/10 cursor-pointer transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="qris"
              checked={paymentMethod === 'qris'}
              onChange={() => setPaymentMethod('qris')}
              className="text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-neutral-700">QRIS (Gopay/OVO/ShopeePay)</span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-brand/10 p-3 hover:bg-brand/10 cursor-pointer transition-colors">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
              className="text-brand focus:ring-brand"
            />
            <span className="text-sm font-medium text-neutral-700">Bayar di Tempat (COD)</span>
          </label>
        </div>

        {customerId && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="rounded border-gray-300 text-brand focus:ring-brand"
            />
            <span className="text-xs text-neutral-600 font-medium">Simpan alamat ini ke profil saya</span>
          </label>
        )}

        {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isSubmitting ? 'Memproses pesanan...' : `Buat Pesanan — ${formatRupiah(totalPrice)}`}
        </button>
      </form>

      <div className="md:col-span-2">
        <h2 className="mb-3 text-base font-bold text-neutral-800">Ringkasan Pesanan</h2>
        <ul className="flex flex-col gap-3 rounded-xl border border-brand/10 bg-white p-4">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2 text-sm">
              <span className="text-neutral-600">
                {item.name} <span className="text-neutral-400">x{item.quantity}</span>
              </span>
              <span className="flex-shrink-0 font-medium text-neutral-800">
                {formatRupiah(item.price * item.quantity)}
              </span>
            </li>
          ))}
          <li className="flex justify-between border-t border-brand/10 pt-3 text-sm font-bold">
            <span>Total</span>
            <span className="text-brand">{formatRupiah(totalPrice)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}