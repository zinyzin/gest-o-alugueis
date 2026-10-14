import { execSync } from 'node:child_process';

// Aplica as migrations no banco de teste antes da suíte.
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public';
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
