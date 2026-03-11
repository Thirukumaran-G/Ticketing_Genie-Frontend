import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        // SSE needs these — disables buffering so events stream immediately
        headers: {
          'Cache-Control': 'no-cache',
        },
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Force no buffering for event-stream responses
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              proxyRes.headers['x-accel-buffering'] = 'no';
            }
          });
        },
      },
    },
  },
});