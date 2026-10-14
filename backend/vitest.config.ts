import { defineConfig } from 'vitest/config';

// Testes rodam contra um banco separado (gestao_imovel_test) no mesmo Postgres do dev.
// As variáveis são definidas aqui para que o dotenv não use o .env de desenvolvimento.
const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL,
      JWT_SECRET: 'segredo-de-teste-com-mais-de-16-caracteres',
      NODE_ENV: 'test',
    },
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
