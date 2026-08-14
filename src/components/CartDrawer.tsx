import { useStore } from '@nanostores/react';
import {
  cartItems,
  cartTotalItems,
  cartTotalPrice,
  isCartOpen,
  closeCart,
  incrementQuantity,
  decrementQuantity,
  removeFromCart,
} from '../stores/cart';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function CartDrawer() {
  const items = useStore(cartItems);
  const totalItems = useStore(cartTotalItems);
  const totalPrice = useStore(cartTotalPrice);
  const isOpen = useStore(isCartOpen);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Keranjang belanja"
          className={`fixed right-0 top-0 z-[60] flex h-full w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 max-h-[85vh] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-brand/10 px-4 py-3">
          <h2 className="text-base font-bold text-neutral-800">
            Keranjang <span className="text-brand font-bold">({totalItems})</span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Tutup keranjang"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.436-7.152.083-.415-.239-.798-.662-.798H5.25M7.5 14.25L5.106 5.272M9.75 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-neutral-600">Keranjang Anda kosong</p>
              <p className="text-xs text-neutral-400">Yuk, mulai belanja sayur segar hari ini.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-neutral-800">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Hapus ${item.name} dari keranjang`}
                        className="flex-shrink-0 text-neutral-300 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {item.unit && <p className="text-xs text-neutral-400">{item.unit}</p>}

                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-brand/20">
                        <button
                          type="button"
                          onClick={() => decrementQuantity(item.id)}
                          aria-label="Kurangi jumlah"
                            className="flex h-6 w-6 items-center justify-center rounded-full text-brand border border-brand hover:bg-brand-dark hover:text-white"
                        >
                          −
                        </button>
                        <span className="min-w-[1.25rem] text-center text-xs font-semibold text-neutral-700">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementQuantity(item.id)}
                          aria-label="Tambah jumlah"
                          disabled={item.stockQuantity != null && item.quantity >= item.stockQuantity}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-brand border border-brand hover:bg-brand-dark hover:text-white disabled:text-neutral-300 disabled:hover:bg-transparent"
                        >
                          +
                        </button>
                      </div>
                        <span className="text-sm font-bold text-gray-900">
                          {formatRupiah(item.price * item.quantity)}
                        </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="sticky bottom-0 z-60 border-t border-brand/10 bg-white px-4 py-4 pb-6 sm:pb-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="text-base font-bold text-gray-900">{formatRupiah(totalPrice)}</span>
            </div>
            <a
              href="/checkout"
              onClick={closeCart}
                className="block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
            >
              Lanjut ke Checkout
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
