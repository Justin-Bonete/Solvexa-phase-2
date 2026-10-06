import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@shared': r('./shared'),
      '@content': r('./content'),
      '@server': r('./server'),
    },
  },
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
  build: { sourcemap: false, target: 'es2022', rollupOptions: { output: {} } },
  test: {
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
