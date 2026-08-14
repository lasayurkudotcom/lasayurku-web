/**
 * src/lib/woocommerce.ts
 *
 * Utility untuk berkomunikasi dengan WooCommerce REST API.
 *
 * PENTING: file ini menggunakan WOOCOMMERCE_CONSUMER_KEY & WOOCOMMERCE_CONSUMER_SECRET
 * (tanpa prefix PUBLIC_), sehingga HANYA boleh dipanggil di sisi server
 * (frontmatter .astro, endpoint API, atau getStaticPaths) — jangan pernah
 * di-import ke dalam script client-side / komponen React yang jalan di browser.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WooCommerceImage {
  id: number;
  src: string;
  name?: string;
  alt: string;
}

export interface WooCommerceCategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: 'default' | 'products' | 'subcategories' | 'both';
  image: WooCommerceImage | null;
  menu_order: number;
  count: number;
}

/** Kategori beserta anak-anaknya, hasil olahan buildCategoryTree() */
export interface WooCommerceCategoryNode extends WooCommerceCategory {
  children: WooCommerceCategory[];
}

export interface WooCommerceAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooCommerceDimensions {
  length: string;
  width: string;
  height: string;
}

export type WooCommerceStockStatus = 'instock' | 'outofstock' | 'onbackorder';

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  stock_status: WooCommerceStockStatus;
  stock_quantity: number | null;
  manage_stock: boolean;
  backorders_allowed: boolean;
  weight: string;
  dimensions: WooCommerceDimensions;
  categories: WooCommerceCategoryRef[];
  images: WooCommerceImage[];
  attributes: WooCommerceAttribute[];
  average_rating: string;
  rating_count: number;
}

export interface GetProductsParams {
  page?: number;
  per_page?: number;
  offset?: number;
  /** ID kategori WooCommerce, bisa lebih dari satu dipisah koma */
  category?: string | number;
  search?: string;
  orderby?: 'date' | 'price' | 'popularity' | 'rating' | 'title' | 'menu_order';
  order?: 'asc' | 'desc';
  featured?: boolean;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
}

export interface PaginatedProducts {
  products: WooCommerceProduct[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
}

// ---------------------------------------------------------------------------
// Konfigurasi & error handling
// ---------------------------------------------------------------------------

const WC_URL = import.meta.env.PUBLIC_WOOCOMMERCE_URL || process.env.PUBLIC_WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WOOCOMMERCE_CONSUMER_KEY || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WOOCOMMERCE_CONSUMER_SECRET || import.meta.env.PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

export class WooCommerceApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'WooCommerceApiError';
    this.status = status;
  }
}

function assertEnv() {
  if (!WC_URL || !CONSUMER_KEY || !CONSUMER_SECRET) {
    throw new WooCommerceApiError(
      'Konfigurasi WooCommerce belum lengkap. Pastikan PUBLIC_WOOCOMMERCE_URL, ' +
      'WOOCOMMERCE_CONSUMER_KEY, dan WOOCOMMERCE_CONSUMER_SECRET sudah diisi di .env'
    );
  }
}

function getAuthHeader(): string {
  const token = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

type QueryValue = string | number | boolean | undefined;

async function wooFetch<T>(
  endpoint: string,
  params: Record<string, QueryValue> = {}
): Promise<{ data: T; totalItems: number; totalPages: number }> {
  assertEnv();

  const url = new URL(`${WC_URL!.replace(/\/$/, '')}/wp-json/wc/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    throw new WooCommerceApiError(
      `Tidak dapat menghubungi server WooCommerce. Periksa koneksi atau URL toko Anda. (${(err as Error).message
      })`
    );
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body?.message ?? '';
    } catch {
      // body bukan JSON valid, abaikan
    }
    throw new WooCommerceApiError(
      `WooCommerce API mengembalikan error ${response.status}: ${detail || response.statusText}`,
      response.status
    );
  }

  const data = (await response.json()) as T;
  const totalItems = Number(response.headers.get('X-WP-Total') ?? 0);
  const totalPages = Number(response.headers.get('X-WP-TotalPages') ?? 0);

  return { data, totalItems, totalPages };
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Mengambil daftar produk dengan dukungan pagination, filter kategori, dan pencarian. */
export async function getProducts(params: GetProductsParams = {}): Promise<PaginatedProducts> {
  const {
    page = 1,
    per_page = 12,
    offset,
    category,
    search,
    orderby = 'date',
    order = 'desc',
    featured,
    on_sale,
    min_price,
    max_price,
  } = params;

  const { data, totalItems, totalPages } = await wooFetch<WooCommerceProduct[]>('products', {
    page,
    per_page,
    offset,
    category,
    search,
    orderby,
    order,
    featured,
    on_sale,
    min_price,
    max_price,
    status: 'publish',
  });

  return {
    products: data,
    totalProducts: totalItems,
    totalPages,
    currentPage: page,
  };
}

/** Mengambil semua kategori produk (termasuk sub-kategori). */
export async function getCategories(): Promise<WooCommerceCategory[]> {
  const { data } = await wooFetch<WooCommerceCategory[]>('products/categories', {
    per_page: 100,
    hide_empty: true,
    orderby: 'name',
    order: 'asc',
  });
  return data;
}

/** Menyusun kategori flat menjadi struktur pohon (parent -> children). */
export function buildCategoryTree(categories: WooCommerceCategory[]): WooCommerceCategoryNode[] {
  const parents = categories.filter((c) => c.parent === 0);
  return parents.map((parent) => ({
    ...parent,
    children: categories.filter((c) => c.parent === parent.id),
  }));
}

/** Mengambil detail satu produk berdasarkan slug. Mengembalikan null jika tidak ditemukan. */
export async function getProductBySlug(slug: string): Promise<WooCommerceProduct | null> {
  const { data } = await wooFetch<WooCommerceProduct[]>('products', { slug });
  return data[0] ?? null;
}

/** Mengambil satu kategori berdasarkan slug. Mengembalikan null jika tidak ditemukan. */
export async function getCategoryBySlug(slug: string): Promise<WooCommerceCategory | null> {
  const { data } = await wooFetch<WooCommerceCategory[]>('products/categories', { slug });
  return data[0] ?? null;
}

// ---------------------------------------------------------------------------
// Orders (checkout)
// ---------------------------------------------------------------------------

export interface OrderLineItemInput {
  product_id: number;
  quantity: number;
}

export interface OrderBillingInput {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  state?: string;
  postcode?: string;
  country?: string;
  email: string;
  phone: string;
}

export interface CreateOrderInput {
  billing: OrderBillingInput;
  line_items: OrderLineItemInput[];
  customer_note?: string;
  payment_method?: string;
  payment_method_title?: string;
  set_paid?: boolean;
  customer_id?: number;
}

export interface WooCommerceOrderLineItem {
  id: number;
  name: string;
  quantity: number;
  total: string;
}

export interface WooCommerceOrder {
  id: number;
  status: string;
  total: string;
  currency: string;
  order_key: string;
  payment_method: string;
  payment_method_title: string;
  line_items: WooCommerceOrderLineItem[];
  billing: OrderBillingInput;
  date_created: string;
  meta_data?: { id?: number; key: string; value: any }[];
}

/** Membuat pesanan baru di WooCommerce. Default metode pembayaran: COD. */
export async function createOrder(input: CreateOrderInput): Promise<WooCommerceOrder> {
  assertEnv();

  const url = new URL(`${WC_URL!.replace(/\/$/, '')}/wp-json/wc/v3/orders`);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_method: input.payment_method ?? 'cod',
        payment_method_title: input.payment_method_title ?? 'Bayar di Tempat (COD)',
        set_paid: input.set_paid ?? false,
        billing: input.billing,
        shipping: input.billing,
        line_items: input.line_items,
        customer_note: input.customer_note ?? '',
        ...(input.customer_id ? { customer_id: input.customer_id } : {}),
      }),
    });
  } catch (err) {
    throw new WooCommerceApiError(`Gagal membuat pesanan: ${(err as Error).message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body?.message ?? '';
    } catch {
      // abaikan
    }
    throw new WooCommerceApiError(
      `Gagal membuat pesanan (${response.status}): ${detail || response.statusText}`,
      response.status
    );
  }

  return (await response.json()) as WooCommerceOrder;
}

/** Mengambil detail pesanan berdasarkan ID. Mengembalikan null jika tidak ditemukan (404). */
export async function getOrderById(id: number): Promise<WooCommerceOrder | null> {
  try {
    const { data } = await wooFetch<WooCommerceOrder>(`orders/${id}`);
    return data;
  } catch (err) {
    if (err instanceof WooCommerceApiError && err.status === 404) return null;
    throw err;
  }
}

/** Mengambil daftar pesanan berdasarkan WooCommerce customer ID. */
export async function getOrdersByCustomer(customerId: number): Promise<WooCommerceOrder[]> {
  const { data } = await wooFetch<WooCommerceOrder[]>('orders', {
    customer: customerId,
    per_page: 20,
    orderby: 'date',
    order: 'desc',
  });
  return data;
}

/** Mengambil semua pesanan (default status: processing) untuk tim Packing/Gudang. */
export async function getProcessingOrders(per_page = 50, status = 'processing'): Promise<WooCommerceOrder[]> {
  const { data } = await wooFetch<WooCommerceOrder[]>('orders', {
    status,
    per_page,
    orderby: 'date',
    order: 'desc',
  });
  return data;
}

/** Mengambil pesanan terbaru untuk Dashboard Admin. */
export async function getRecentOrders(per_page = 20): Promise<WooCommerceOrder[]> {
  const { data } = await wooFetch<WooCommerceOrder[]>('orders', {
    per_page,
    orderby: 'date',
    order: 'desc',
  });
  return data;
}

/** Mengubah status pesanan WooCommerce (mis. 'processing' -> 'completed' / 'on-hold'). */
export async function updateOrderStatus(
  id: number,
  status: string,
  note?: string,
  meta_data?: any[]
): Promise<WooCommerceOrder> {
  assertEnv();
  const url = new URL(`${WC_URL!.replace(/\/$/, '')}/wp-json/wc/v3/orders/${id}`);

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      ...(note ? { customer_note: note } : {}),
      ...(meta_data ? { meta_data } : {}),
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { message?: string };
      detail = body?.message ?? '';
    } catch {
      // abaikan
    }
    throw new WooCommerceApiError(
      `Gagal memperbarui status pesanan #${id}: ${detail || response.statusText}`,
      response.status
    );
  }

  return (await response.json()) as WooCommerceOrder;
}

// ---------------------------------------------------------------------------
// Helper tampilan (dipakai oleh komponen)
// ---------------------------------------------------------------------------

/** Format angka menjadi Rupiah, mis. 15000 -> "Rp15.000" */
export function formatRupiah(price: string | number): string {
  const num = Number(price);
  if (Number.isNaN(num)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

/** Menghitung persentase diskon dari regular_price vs sale_price. */
export function getDiscountPercentage(product: WooCommerceProduct): number {
  if (!product.on_sale || !product.regular_price || !product.sale_price) return 0;
  const regular = Number(product.regular_price);
  const sale = Number(product.sale_price);
  if (!regular || regular <= sale) return 0;
  return Math.round(((regular - sale) / regular) * 100);
}

/**
 * Mengambil label satuan/timbangan produk (mis. "250 gram", "1 ikat").
 * Mencari di attribute bernama "satuan"/"unit"/"berat", fallback ke field weight.
 */
export function getProductUnit(product: WooCommerceProduct): string {
  const unitAttribute = product.attributes?.find((attr) => /satuan|unit|berat/i.test(attr.name));
  if (unitAttribute?.options?.[0]) return unitAttribute.options[0];
  if (product.weight) return `${product.weight} gram`;
  return '';
}
