import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadAlbedoConfig } from './config/loadAlbedoConfig.ts';

const albedo = loadAlbedoConfig();

export default defineConfig({
  plugins: [react()],
  server: {
    // __Host- cookies живут на localhost, не на 127.0.0.1
    host: albedo.listenHost,
    port: albedo.listenPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: albedo.apiUrl,
        changeOrigin: true,
        ws: true,
        // запрет: cookieDomainRewrite, cookiePathRewrite — иначе __Host- умрёт
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
