import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { generateDynamicQris } from '../../lib/qris';

interface Product {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  stock_quantity: number | null;
  images: { src: string }[];
}

interface Category {
  id: number;
  name: string;
  parent?: number;
}

interface CartItem extends Product {
  cartQuantity: number;
}

export default function POSApp() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('pos_cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const cashierName =
    typeof window !== 'undefined'
      ? localStorage.getItem('pos_offline_nicename') ||
        localStorage.getItem('admin_user_nicename') ||
        'kasiroffline'
      : 'kasiroffline';

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pos_offline_token') || localStorage.getItem('pos_online_token');
    const role =
      localStorage.getItem('pos_offline_role') ||
      localStorage.getItem('pos_online_role') ||
      localStorage.getItem('admin_user_role') ||
      '';
    // Hanya role "kasir" yang bisa akses kasir page
    const isKasir = role === 'kasir';
    const isAdmin = role.includes('admin');
    if (!token || (!isKasir && !isAdmin)) {
      window.location.replace('/login?from=admin&error=denied');
    }
  }, []);

  const sanitizeName = (str: string) => {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar dari Kasir POS?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_offline_token');
        localStorage.removeItem('pos_offline_role');
        localStorage.removeItem('pos_offline_nicename');
        document.cookie =
          'pos_offline_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie =
          'pos_offline_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie =
          'pos_offline_nicename=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        const stillOnline = localStorage.getItem('pos_online_token');
        if (!stillOnline) {
          localStorage.removeItem('admin_user_role');
          localStorage.removeItem('user_role');
          document.cookie =
            'admin_user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        }
        window.location.href = '/login?from=admin';
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/adminrisman/pos/categories');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.categories || data.data || [];
        setCategories(list);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProducts = async (catId?: number | null, search?: string) => {
    setIsLoading(true);
    try {
      let url = '/api/adminrisman/pos/products?per_page=50';
      if (catId) url += `&category=${catId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.products || data.data || [];
        setProducts(list);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const topCategories = useMemo(() => {
    return categories.filter((c) => !c.parent || c.parent === 0);
  }, [categories]);

  const subCategoriesMap = useMemo(() => {
    const map: Record<number, Category[]> = {};
    categories.forEach((c) => {
      if (c.parent && c.parent !== 0) {
        if (!map[c.parent]) map[c.parent] = [];
        map[c.parent].push(c);
      }
    });
    return map;
  }, [categories]);

  const handleTopCategoryClick = (catId: number) => {
    if (expandedCategoryId === catId) {
      setExpandedCategoryId(null);
    } else {
      setExpandedCategoryId(catId);
    }
    setActiveCategory(catId);
    setSearchQuery('');
    fetchProducts(catId);
  };

  const handleSubCategoryClick = (subId: number) => {
    setActiveCategory(subId);
    setSearchQuery('');
    fetchProducts(subId);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(activeCategory, searchQuery);
  };

  const formatRupiah = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.cartQuantity + delta;
            return newQty > 0 ? { ...item, cartQuantity: newQty } : item;
          }
          return item;
        })
        .filter((item) => item.cartQuantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartCount = useMemo(() => {
    return cart.reduce((count, item) => count + item.cartQuantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) => total + Number(item.price || 0) * item.cartQuantity,
      0
    );
  }, [cart]);

  const changeAmount = useMemo(() => {
    const received = Number(cashReceived);
    if (received >= cartTotal) {
      return received - cartTotal;
    }
    return 0;
  }, [cashReceived, cartTotal]);

  const getQrisImageUrl = (amount: number) => {
    if (amount <= 0) return '';
    try {
      const payload = generateDynamicQris(amount);
      return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=M&margin=2&data=${encodeURIComponent(
        payload
      )}`;
    } catch (err) {
      console.error('Gagal generate QRIS dinamis POS:', err);
      return '';
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong!');

    const received = Number(cashReceived);
    if (paymentMethod === 'pos_cash' && received < cartTotal) {
      return alert('Uang diterima kurang dari total belanja!');
    }

    setIsSubmitting(true);
    try {
      const line_items = cart.map((item) => ({
        product_id: item.id,
        quantity: item.cartQuantity,
      }));

      const payload = {
        payment_method: paymentMethod,
        payment_method_title:
          paymentMethod === 'pos_cash' ? 'Tunai Toko / POS' : 'QRIS / EDC',
        set_paid: true,
        status: 'completed',
        line_items,
        billing: {
          first_name: 'Kasir',
          last_name: cashierName,
          phone: '0800000000',
          address_1: 'Toko La Sayurku (Offline)',
          city: 'Bandung',
          email: 'kasiroffline@lasayurku.com',
        },
        meta_data: [
          { key: 'order_source', value: 'POS_OFFLINE' },
          { key: 'cashier_name', value: cashierName },
          { key: 'cash_received', value: received },
          { key: 'cash_change', value: changeAmount },
        ],
      };

      const res = await fetch('/api/adminrisman/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && (data.success || data.id || data.order)) {
        const orderId = data.order?.id || data.id || data.order_id;
        alert(`Transaksi Berhasil! Order ID: #${orderId}`);
        setCart([]);
        setCashReceived('');
        setIsMobileCartOpen(false);
      } else {
        console.error('Error Checkout Response:', data);
        alert(
          `Gagal Transaksi: ${data.message || data.error || 'Terjadi kesalahan pada server WooCommerce'
          }`
        );
      }
    } catch (err: any) {
      console.error('Network/Client Error:', err);
      alert('Terjadi kesalahan jaringan atau koneksi API terputus.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCartUI = (
    <div className="flex flex-col h-full min-h-0 justify-between overflow-hidden">
      {/* 1. Daftar Item Keranjang (Scroll Mandiri) */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {cart.length === 0 ? (
          <div className="text-center text-sm text-slate-500 my-auto py-10">
            Belum ada produk dipilih. <br /> Klik produk di katalog untuk menambahkan.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 items-center border-b pb-3 last:border-0 shrink-0"
            >
              <div className="flex-1 flex flex-col">
                <span className="text-sm font-semibold leading-tight line-clamp-1">
                  {sanitizeName(item.name)}
                </span>
                <span className="text-xs text-emerald-600 font-medium">
                  {formatRupiah(item.price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateCartQty(item.id, -1)}
                  className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 font-bold active:scale-95 text-slate-700"
                >
                  -
                </button>
                <span className="text-sm font-medium w-5 text-center">
                  {item.cartQuantity}
                </span>
                <button
                  onClick={() => updateCartQty(item.id, 1)}
                  className="h-7 w-7 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 font-bold active:scale-95 text-slate-700"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="h-7 w-7 text-red-500 hover:bg-red-50 rounded flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* 2. Ringkasan Pembayaran & Tombol Checkout (Fixed/Sticky Bottom) */}
      <div className="p-4 border-t bg-slate-50 flex flex-col gap-3 shrink-0 overflow-y-auto max-h-[60vh]">
        <div className="flex justify-between items-center text-lg font-bold">
          <span>Total</span>
          <span className="text-emerald-600 text-xl">
            {formatRupiah(cartTotal)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === 'pos_cash' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('pos_cash')}
            >
              Tunai (Cash)
            </Button>
            <Button
              variant={paymentMethod === 'qris' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentMethod('qris')}
            >
              QRIS / EDC
            </Button>
          </div>
        </div>

        {paymentMethod === 'pos_cash' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">
              Uang Diterima
            </label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={
                cashReceived
                  ? Number(cashReceived).toLocaleString('id-ID')
                  : ''
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setCashReceived(raw);
              }}
              className="font-bold text-lg h-10"
            />

            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-slate-500 font-medium">
                Kembalian:
              </span>
              <span
                className={`text-lg font-bold ${changeAmount > 0 ? 'text-green-600' : 'text-slate-900'
                  }`}
              >
                {formatRupiah(changeAmount)}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'qris' && cartTotal > 0 && (
          <div className="flex flex-col items-center justify-center p-2.5 border rounded-xl bg-slate-100/80 my-0.5 text-center shrink-0">
            <p className="text-[11px] font-semibold text-slate-700 mb-1">
              QRIS Dinamis — Nominal {formatRupiah(cartTotal)}
            </p>
            {getQrisImageUrl(cartTotal) ? (
              <img
                src={getQrisImageUrl(cartTotal)}
                alt="QRIS Dinamis Kasir POS"
                className="h-36 w-36 object-contain rounded-lg border bg-white p-1 shadow-xs"
              />
            ) : (
              <div className="h-36 w-36 flex items-center justify-center bg-slate-200 text-xs text-slate-500 rounded-lg">
                Gagal memuat QRIS
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
              Minta pembeli scan QRIS di atas via DANA, BCA, Mandiri, ShopeePay, Gopay, atau OVO.
            </p>
          </div>
        )}

        <Button
          className="w-full h-11 text-base bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          onClick={handleCheckout}
          disabled={isSubmitting || cart.length === 0}
        >
          {isSubmitting ? 'Memproses...' : 'Proses Transaksi'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50 overflow-hidden text-slate-900 font-sans relative">
      {/* Header */}
      <header className="flex h-14 md:h-16 shrink-0 items-center justify-between border-b bg-white px-4 md:px-6 shadow-xs z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-lg md:text-xl font-bold text-emerald-600">
            Kasir POS
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] md:text-xs bg-slate-100 px-1.5 py-0.5"
          >
            Offline
          </Badge>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600 hidden lg:flex">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Terhubung ke API
          </div>

          <div className="border-l pl-2 md:pl-4 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs md:text-sm">
                {cashierName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs md:text-sm font-semibold max-w-[80px] md:max-w-none truncate">
                {cashierName}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-[10px] md:text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-7 px-2 ml-1"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          {/* Toolbar Search & Kategori */}
          <div className="flex flex-col gap-2 md:gap-3 p-3 md:p-4 border-b bg-white shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <Input
                placeholder="Cari nama produk atau SKU..."
                value={searchQuery}
                onChange={handleSearch}
                className="flex-1 text-sm h-9 md:h-10"
              />
              <Button type="submit" size="sm" className="h-9 md:h-10 px-3 md:px-4">
                Cari
              </Button>
            </form>

            {/* Filter Kategori Expandable */}
            <div className="flex flex-col gap-1.5 md:gap-2">
              <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
                <Button
                  variant={activeCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setExpandedCategoryId(null);
                    setActiveCategory(null);
                    setSearchQuery('');
                    fetchProducts(null);
                  }}
                  className="shrink-0 text-xs h-8 px-2.5"
                >
                  Semua
                </Button>

                {topCategories.map((cat) => {
                  const hasSub =
                    subCategoriesMap[cat.id] &&
                    subCategoriesMap[cat.id].length > 0;
                  const isExpanded = expandedCategoryId === cat.id;
                  const isParentActive = activeCategory === cat.id;

                  return (
                    <Button
                      key={cat.id}
                      variant={isParentActive || isExpanded ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTopCategoryClick(cat.id)}
                      className="shrink-0 gap-1 text-xs h-8 px-2.5"
                    >
                      <span>{sanitizeName(cat.name)}</span>
                      {hasSub && (
                        <span
                          className={`text-[9px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}
                        >
                          ▼
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>

              {/* Subkategori Panel */}
              {expandedCategoryId && subCategoriesMap[expandedCategoryId] && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2.5 bg-slate-100/80 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-1">
                    Sub:
                  </span>

                  <Button
                    variant={
                      activeCategory === expandedCategoryId ? 'default' : 'ghost'
                    }
                    size="sm"
                    onClick={() => handleSubCategoryClick(expandedCategoryId)}
                    className="shrink-0 text-[11px] h-6 px-2 bg-white shadow-xs border border-slate-200"
                  >
                    Semua
                  </Button>

                  {subCategoriesMap[expandedCategoryId].map((sub) => (
                    <Button
                      key={sub.id}
                      variant={activeCategory === sub.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleSubCategoryClick(sub.id)}
                      className={`shrink-0 text-[11px] h-6 px-2 ${activeCategory === sub.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700'
                        } shadow-xs border border-slate-200`}
                    >
                      {sanitizeName(sub.name)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid Produk */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 bg-slate-50">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                Memuat produk...
              </div>
            ) : products.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-500 text-sm">
                Produk tidak ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="overflow-hidden flex flex-col cursor-pointer hover:border-emerald-500 active:scale-98 transition-transform"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0].src}
                          alt={sanitizeName(product.name)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">
                          No Image
                        </div>
                      )}
                      {product.stock_quantity !== null && (
                        <div className="absolute top-1.5 right-1.5 bg-white/95 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold shadow-xs">
                          Stok: {product.stock_quantity}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2 md:p-3 flex-1 flex flex-col justify-between gap-1 md:gap-2">
                      <h3 className="text-xs md:text-sm font-semibold line-clamp-2 leading-tight">
                        {sanitizeName(product.name)}
                      </h3>
                      <div className="text-emerald-600 font-bold text-xs md:text-sm">
                        {formatRupiah(product.price)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel Keranjang Desktop (Fixed Height) */}
        <div className="w-full max-w-sm border-l bg-white flex flex-col shrink-0 z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.03)] hidden md:flex h-full overflow-hidden">
          <div className="p-4 border-b bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold">Keranjang Pesanan</h2>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {renderCartUI}
          </div>
        </div>
      </div>

      {/* Floating Bar Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-lg z-30 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] text-slate-500">
            {totalCartCount} Item di Keranjang
          </span>
          <span className="text-base font-bold text-emerald-600">
            {formatRupiah(cartTotal)}
          </span>
        </div>
        <Button
          onClick={() => setIsMobileCartOpen(true)}
          disabled={cart.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 h-10 text-sm"
        >
          Lihat Pesanan ({totalCartCount})
        </Button>
      </div>

      {/* Drawer Mobile */}
      {isMobileCartOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-2xl max-h-[90vh] flex flex-col w-full overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="text-base font-bold">
                Detail Keranjang ({totalCartCount})
              </h2>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderCartUI}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}