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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/@vercel/analytics/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (id.includes('node_modules/react-icons/')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/react-easy-crop/') || id.includes('node_modules/jszip/')) {
            return 'vendor-tools';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
