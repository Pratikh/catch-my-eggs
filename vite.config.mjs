import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages serves this project from a sub-path:
 *   https://pratikh.github.io/catch-my-eggs/
 * so assets must be requested relative to `/catch-my-eggs/`, never `/`.
 *
 * Locally (`npm run dev`) and on any root-hosted static server we still want
 * plain `/`, so the base is only switched on for production builds.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/catch-my-eggs/' : '/',
  plugins: [react()],
  build: {
    outDir: 'build',
    // Inline anything tiny (svg icons) to avoid extra round-trips.
    assetsInlineLimit: 4096,
    // CRA emitted `build/static/...`; keeping hashed assets at the root is
    // simpler and avoids deep nested folders on Pages.
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 3000,
    host: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
    include: ['src/**/*.test.{js,jsx}'],
  },
}));
