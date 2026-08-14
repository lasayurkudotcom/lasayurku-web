/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1b6b38',
          dark: '#155029',
          light: '#D8F2DC',
        },
        pri: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b' },
        side: { DEFAULT:'#0a0f1e', hover:'#111833', active:'#162040' },
        warn: { DEFAULT:'#d97706', light:'#fef3c7' },
        danger: { DEFAULT:'#dc2626', light:'#fee2e2' }
      },
    },
  },
  plugins: [
    // Dibutuhkan oleh class `prose` yang dipakai untuk merender deskripsi
    // produk/kategori (HTML) dari WooCommerce di halaman detail produk & kategori.
    require('@tailwindcss/typography'),
  ],
};
