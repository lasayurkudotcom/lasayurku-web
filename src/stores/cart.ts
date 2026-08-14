/**
 * src/stores/cart.ts
 *
 * State keranjang belanja global menggunakan Nanostores.
 * `cartItems` otomatis tersinkron ke localStorage (key: "lasayurku:cart")
 * lewat @nanostores/persistent, sehingga isi keranjang tidak hilang saat refresh.
 *
 * Store ini murni JS/TS (framework-agnostic) sehingga bisa dipakai baik dari
 * komponen React (via @nanostores/react) maupun dari <script> biasa di file .astro.
 */

import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartItem {
  id: number;
  slug: string;
  name: string;
  image: string;
  /** Harga final per satuan (setelah diskon jika ada) */
  price: number;
  /** Harga sebelum diskon, untuk ditampilkan dicoret. 0 jika tidak sedang diskon */
  regularPrice: number;
  /** Label satuan/timbangan, mis. "250 gram" atau "1 ikat" */
  unit: string;
  quantity: number;
  /** null berarti stok tidak dibatasi / tidak diketahui */
  stockQuantity: number | null;
}

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/** Isi keranjang, persisten ke localStorage. */
export const cartItems = persistentAtom<CartItem[]>('lasayurku:cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

/** Status buka/tutup drawer keranjang. Sengaja TIDAK persisten (selalu tertutup saat reload). */
export const isCartOpen = atom<boolean>(false);

/** Total jumlah barang (menjumlahkan quantity semua item). */
export const cartTotalItems = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

/** Total harga seluruh isi keranjang. */
export const cartTotalPrice = computed(cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function openCart() {
  isCartOpen.set(true);
}

export function closeCart() {
  isCartOpen.set(false);
}

export function toggleCart() {
  isCartOpen.set(!isCartOpen.get());
}

/** Batas kuantitas mengikuti stockQuantity produk jika tersedia. */
function clampQuantity(quantity: number, stockQuantity: number | null): number {
  if (quantity < 1) return 1;
  if (stockQuantity != null) return Math.min(quantity, stockQuantity);
  return quantity;
}

/** Menambahkan produk ke keranjang. Jika produk sudah ada, quantity ditambahkan. */
export function addToCart(product: Omit<CartItem, 'quantity'>, quantity = 1) {
  const items = cartItems.get();
  const existing = items.find((item) => item.id === product.id);

  if (existing) {
    const newQuantity = clampQuantity(existing.quantity + quantity, existing.stockQuantity);
    cartItems.set(
      items.map((item) => (item.id === product.id ? { ...item, quantity: newQuantity } : item))
    );
  } else {
    const initialQuantity = clampQuantity(quantity, product.stockQuantity);
    cartItems.set([...items, { ...product, quantity: initialQuantity }]);
  }

  openCart();
}

export function removeFromCart(id: number) {
  cartItems.set(cartItems.get().filter((item) => item.id !== id));
}

/** Mengubah quantity langsung. Quantity <= 0 akan menghapus item dari keranjang. */
export function updateQuantity(id: number, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(id);
    return;
  }
  cartItems.set(
    cartItems.get().map((item) =>
      item.id === id ? { ...item, quantity: clampQuantity(quantity, item.stockQuantity) } : item
    )
  );
}

export function incrementQuantity(id: number) {
  const item = cartItems.get().find((i) => i.id === id);
  if (item) updateQuantity(id, item.quantity + 1);
}

export function decrementQuantity(id: number) {
  const item = cartItems.get().find((i) => i.id === id);
  if (item) updateQuantity(id, item.quantity - 1);
}

export function clearCart() {
  cartItems.set([]);
}
