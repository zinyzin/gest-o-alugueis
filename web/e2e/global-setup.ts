import { execSync } from 'node:child_process';

// Prepara o banco de teste (migrations) antes de subir a API dos testes.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    cwd: '../backend',
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public' },
  });
}
