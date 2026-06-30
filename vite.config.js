import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `npm run dev`, the Vite dev server (this process) serves the React app
// and proxies `/api/*` to `wrangler pages dev`, which runs the Pages Functions
// and the local D1 database. See package.json scripts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
  build: {
    outDir: 'dist',
  },
});
