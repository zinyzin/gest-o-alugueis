import { execSync } from 'node:child_process';
import { expect, type Page, request } from '@playwright/test';

const API = 'http://localhost:3334/api';

// Convite gerado pelo terminal (mesmo caminho da primeira conta em produção), no banco de teste.
export function conviteDoTerminal() {
  return execSync('npx tsx src/scripts/convite.ts 120', {
    cwd: '../backend',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public',
      JWT_SECRET: 'segredo-e2e-com-mais-de-16-caracteres',
    },
  })
    .toString()
    .trim();
}

// Cria um usuário novo (e-mail único por execução) com um imóvel, direto pela API.
export async function prepararUsuario(prefixo = 'e2e') {
  const email = `${prefixo}-${Date.now()}-${Math.round(Math.random() * 1e6)}@teste.com`;
  const senha = 'senha-segura-1';
  const ctx = await request.newContext();
  await ctx.post(`${API}/auth/registrar`, { data: { nome: prefixo, email, senha, convite: conviteDoTerminal() } });
  const login = await (await ctx.post(`${API}/auth/login`, { data: { email, senha } })).json();
  const auth = { Authorization: `Bearer ${login.token}` };
  const imovel = await (await ctx.post(`${API}/imoveis`, { headers: auth, data: { endereco: `Rua E2E ${Date.now()}` } })).json();
  return { email, senha, token: login.token as string, imovelId: imovel.id as string, ctx, auth };
}

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/');
  await page.locator('.field:has(label:text-is("E-mail")) input').fill(email);
  await page.locator('.field:has(label:text-is("Senha")) input').fill(senha);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByText(/sair/i)).toBeVisible();
}

// Campo de formulário pelo texto do rótulo, dentro de um contêiner.
export const campo = (raiz: ReturnType<Page['locator']>, rotulo: string) =>
  raiz.locator(`.field:has(label:text-is("${rotulo}")) :is(input, select)`);
