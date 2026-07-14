import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Encaminha chamadas de API para o backend em dev.
    proxy: {
      '/auth': 'http://localhost:3333',
      '/imoveis': 'http://localhost:3333',
      '/inquilinos': 'http://localhost:3333',
      '/contratos': 'http://localhost:3333',
      '/receitas': 'http://localhost:3333',
      '/despesas': 'http://localhost:3333',
      '/dashboard': 'http://localhost:3333',
      '/relatorios': 'http://localhost:3333',
      '/uploads': 'http://localhost:3333',
      '/arquivos': 'http://localhost:3333',
    },
  },
});
