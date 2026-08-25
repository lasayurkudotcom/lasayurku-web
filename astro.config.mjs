import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static', // Ubah ke static
  integrations: [tailwind(), react()],
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@lib': '/src/lib',
      },
    },
  },
});