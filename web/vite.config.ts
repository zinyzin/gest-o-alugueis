import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev, API, arquivos e socket passam pelo proxy (mesma origem, como em produção).
// API_URL permite apontar para outra API (ex.: a dos testes de ponta a ponta).
const API_URL = process.env.API_URL ?? 'http://localhost:3333';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8008,
    proxy: {
      '/api': API_URL,
      '/arquivos': API_URL,
      '/socket.io': { target: API_URL, ws: true },
    },
  },
});
