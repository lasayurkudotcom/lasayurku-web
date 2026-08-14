/**
 * src/lib/banners.ts
 *
 * Sumber data untuk slide banner utama di beranda.
 *
 * Untuk sekarang datanya berupa array statis (gampang diedit tanpa perlu ubah
 * struktur WordPress). Jika suatu saat ingin banner dikelola dari WordPress
 * (mis. lewat ACF Options Page atau custom REST route `/wp-json/lasayurku/v1/banners`),
 * tinggal ganti isi `getHeroBanners()` menjadi `fetch()` ke endpoint tersebut —
 * bentuk `HeroBanner` di bawah ini bisa dipakai apa adanya sebagai kontrak datanya,
 * dan `BannerSlider.tsx` tidak perlu diubah sama sekali.
 */

export interface HeroBanner {
  id: string;
  /** Link tujuan saat banner/tombol CTA diklik */
  href: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  /**
   * URL gambar promo (mis. dari WordPress Media Library) yang ditampilkan
   * di sisi kanan banner. Kosongkan jika hanya ingin teks + gradient warna.
   */
  image?: string;
  /** Warna gradient tailwind, mis. "from-brand to-brand-dark" */
  gradient: string;
}

export function getHeroBanners(): HeroBanner[] {
  return [
    {
      id: 'segar-setiap-hari',
      href: '#produk',
      eyebrow: 'Segar setiap hari',
      title: 'Belanja sayur & bahan segar, diantar langsung ke rumah',
      subtitle: 'Dipetik pagi ini, dikirim hari ini juga.',
      ctaLabel: 'Mulai Belanja',
      gradient: 'from-brand to-brand-dark',
    },
    {
      id: 'harga-gila',
      href: '/promo',
      eyebrow: 'Periode terbatas',
      title: 'Harga Gila, Diskon hingga 31%',
      subtitle: 'Minyak goreng, beras, dan bahan pokok pilihan.',
      ctaLabel: 'Klik di Sini',
      gradient: 'from-fuchsia-600 to-rose-500',
    },
    {
      id: 'pesta-gajian',
      href: '/promo',
      eyebrow: 'Pesta Gajian',
      title: 'Belanja sebulan, hemat sampai akhir bulan',
      subtitle: 'Gratis ongkir untuk pesanan pertama minggu ini.',
      ctaLabel: 'Belanja Sekarang',
      gradient: 'from-orange-500 to-amber-400',
    },
  ];
}
