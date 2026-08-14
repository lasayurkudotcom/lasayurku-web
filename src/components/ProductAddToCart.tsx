import { useState } from 'react';
import { addToCart } from '../stores/cart';

interface Props {
  id: number;
  slug: string;
  name: string;
  image: string;
  price: number;
  regularPrice: number;
  unit: string;
  stockQuantity: number | null;
  isOutOfStock: boolean;
}

export default function ProductAddToCart(props: Props) {
  const [quantity, setQuantity] = useState(1);
  const max = props.stockQuantity ?? Infinity;

  const decrease = () => setQuantity((q) => Math.max(1, q - 1));
  const increase = () => setQuantity((q) => Math.min(max, q + 1));

  const handleAdd = () => {
    addToCart(
      {
        id: props.id,
        slug: props.slug,
        name: props.name,
        image: props.image,
        price: props.price,
        regularPrice: props.regularPrice,
        unit: props.unit,
        stockQuantity: props.stockQuantity,
      },
      quantity
    );
    setQuantity(1);
  };

  if (props.isOutOfStock) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-xl bg-neutral-200 py-3 text-sm font-semibold text-neutral-400"
      >
        Stok Habis
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 rounded-full border border-brand/20 px-2 py-1">
        <button
          type="button"
          onClick={decrease}
          aria-label="Kurangi jumlah"
          className="flex h-8 w-8 items-center justify-center rounded-full text-brand hover:bg-brand/10"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center text-sm font-semibold text-neutral-700">{quantity}</span>
        <button
          type="button"
          onClick={increase}
          aria-label="Tambah jumlah"
          disabled={quantity >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full text-brand hover:bg-brand/10 disabled:text-neutral-300 disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
      >
        + Tambah ke Keranjang
      </button>
    </div>
  );
}
