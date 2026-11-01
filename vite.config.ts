import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite handles the dev server and production build.
// The Tailwind plugin scans our source files and generates only the CSS we use.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/sticker-club/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
