import { useState } from 'react';

// Storefront ini headless (Astro + WooCommerce REST API) sehingga TIDAK menyimpan
// password pelanggan sendiri — proses masuk/daftar yang sesungguhnya tetap
// ditangani oleh halaman "My Account" bawaan WordPress/WooCommerce, yang sudah
// aman (hashing password, reset password, dsb). Modal ini hanya membungkusnya
// dengan tampilan yang konsisten dengan desain toko.
const WP_URL = (import.meta.env.PUBLIC_WOOCOMMERCE_URL ?? '').replace(/\/$/, '');
const ACCOUNT_URL = `${WP_URL}/my-account/`;
const REGISTER_URL = `${WP_URL}/my-account/#register`;

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Masuk / Daftar
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Masuk atau daftar akun"
            className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-xl sm:left-1/2 sm:right-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup"
              className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-neutral-800">Masuk ke Akun LaSayurku</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Pakai nomor WhatsApp atau email yang sama seperti saat checkout terakhir Anda.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={ACCOUNT_URL}
                className="rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Masuk dengan Akun
              </a>
              <a
                href={REGISTER_URL}
                className="rounded-xl border border-brand py-3 text-center text-sm font-semibold text-brand hover:bg-brand/10"
              >
                Daftar Akun Baru
              </a>
            </div>

            <p className="mt-4 text-center text-xs text-neutral-400">
              Anda akan diarahkan ke halaman akun resmi LaSayurku yang aman.
            </p>
          </div>
        </>
      )}
    </>
  );
}
