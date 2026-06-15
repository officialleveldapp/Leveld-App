import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// In production the panel is served by Django under /static/panel/ (assets) and
// the SPA shell at /panel. In dev we serve from the Vite root.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/static/panel/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    outDir: path.resolve(__dirname, '../backend/panel_dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}));
