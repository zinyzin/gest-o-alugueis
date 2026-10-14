import { expect, test } from '@playwright/test';
import { campo, entrar, prepararUsuario } from './apoio';

test('criar conta pela tela, receber o imóvel compartilhado e perder o acesso', async ({ page, browser }) => {
  const dono = await prepararUsuario('dono');
  const emailNovo = `novo-${Date.now()}@teste.com`;

  // Nova pessoa cria a conta pela tela e entra direto, sem imóveis.
  const novo = await (await browser.newContext()).newPage();
  await novo.goto('/');
  await novo.getByRole('button', { name: 'Criar conta' }).click();
  const form = novo.locator('form');
  await campo(form, 'Nome').fill('Val');
  await campo(form, 'E-mail').fill(emailNovo);
  await campo(form, 'Senha').fill('senha-segura-1');
  await form.getByRole('button', { name: 'Criar conta' }).click();
  await expect(novo.getByText('Nenhum imóvel ainda')).toBeVisible();

  // O dono compartilha pela tela de cadastros.
  await entrar(page, dono.email, dono.senha);
  await page.goto(`/imoveis/${dono.imovelId}/cadastros`);
  await page.getByLabel('E-mail para compartilhar').fill('ninguem@teste.com');
  await page.getByRole('button', { name: 'Compartilhar' }).click();
  await expect(page.getByText('A pessoa precisa criar a conta primeiro')).toBeVisible();
  await page.getByLabel('E-mail para compartilhar').fill(emailNovo);
  await page.getByRole('button', { name: 'Compartilhar' }).click();
  const cardAcesso = page.locator('.card', { has: page.getByRole('heading', { name: 'Pessoas com acesso' }) });
  await expect(cardAcesso).toContainText(emailNovo);

  await novo.reload();
  await expect(novo.locator('.list-item')).toHaveCount(1);

  // O dono remove o acesso; a outra pessoa deixa de ver o imóvel.
  page.once('dialog', (d) => d.accept());
  await cardAcesso.locator('.list-item', { hasText: emailNovo }).getByRole('button', { name: 'Remover acesso' }).click();
  await expect(cardAcesso).not.toContainText(emailNovo);
  await novo.reload();
  await expect(novo.getByText('Nenhum imóvel ainda')).toBeVisible();
});
