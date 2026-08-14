import { useStore } from '@nanostores/react';
import { cartTotalItems, toggleCart } from '../stores/cart';

export default function CartIcon() {
  const totalItems = useStore(cartTotalItems);

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={`Buka keranjang belanja, ${totalItems} barang`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-brand/10 hover:text-brand"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.436-7.152.083-.415-.239-.798-.662-.798H5.25M7.5 14.25L5.106 5.272M9.75 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      {totalItems > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </button>
  );
}
