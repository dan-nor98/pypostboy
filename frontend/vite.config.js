import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  publicDir: 'public',
  build: {
    outDir: resolve(__dirname, '../public'),
    emptyOutDir: false,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        recover: resolve(__dirname, 'recover.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': 'http://localhost:3001',
      '/client-proxy': 'http://localhost:3001',
      '/favicon.ico': 'http://localhost:3001',
    },
  },
});
