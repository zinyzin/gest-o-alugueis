import { defineConfig } from '@playwright/test';

// Os testes de ponta a ponta sobem uma API própria (porta 3334, banco gestao_imovel_test)
// e um web apontando para ela (porta 8009): o banco de desenvolvimento não é tocado.
const DATABASE_URL = 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: { baseURL: 'http://localhost:8009', locale: 'pt-BR' },
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: 'npx tsx src/index.ts',
      cwd: '../backend',
      port: 3334,
      reuseExistingServer: false,
      env: { DATABASE_URL, JWT_SECRET: 'segredo-e2e-com-mais-de-16-caracteres', PORT: '3334', CORS_ORIGIN: 'http://localhost:8009', ROTINAS_ATIVAS: 'false', LIMITE_CADASTRO: '10000' },
    },
    {
      command: 'npx vite --port 8009 --strictPort',
      port: 8009,
      reuseExistingServer: false,
      env: { API_URL: 'http://localhost:3334' },
    },
  ],
});
