import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = `http://localhost:${process.env.API_PORT ?? '8080'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': target,
      '/uploads': target,
    },
  },
});
