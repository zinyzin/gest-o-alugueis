import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha chamadas de API e arquivos para o backend em dev.
    proxy: {
      '/api': 'http://localhost:3333',
      '/arquivos': 'http://localhost:3333',
    },
  },
});
