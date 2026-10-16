import { expect, test } from '@playwright/test';
import { campo, entrar, prepararUsuario } from './apoio';

test('criar conta pela tela, receber o imóvel compartilhado e perder o acesso', async ({ page, browser }) => {
  const dono = await prepararUsuario('dono');
  const emailNovo = `novo-${Date.now()}@teste.com`;

  // A tela de login não oferece cadastro, e /convite sem link válido não deixa criar conta.
  const novo = await (await browser.newContext()).newPage();
  await novo.goto('/');
  await expect(novo.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(novo.getByText('Criar conta')).toHaveCount(0);
  await novo.goto('/convite');
  await expect(novo.getByText('venceu ou já foi usado')).toBeVisible();

  // O dono gera o convite pela tela.
  await entrar(page, dono.email, dono.senha);
  await page.getByRole('button', { name: 'Convidar pessoa' }).click();
  await page.getByRole('dialog', { name: 'Convidar pessoa' }).locator('select').selectOption('30');
  await page.getByRole('button', { name: 'Gerar link' }).click();
  const link = await page.getByLabel('Link do convite').inputValue();
  expect(link).toContain('/convite?token=');

  // A nova pessoa cria a conta pelo link e entra direto, sem imóveis.
  await novo.goto(link);
  const form = novo.locator('form');
  await campo(form, 'Nome').fill('Val');
  await campo(form, 'E-mail').fill(emailNovo);
  await campo(form, 'Senha').fill('1');
  await form.getByRole('button', { name: 'Criar conta' }).click();
  await expect(novo.getByText('Nenhum imóvel ainda')).toBeVisible();

  // O mesmo link não serve de novo.
  const outro = await (await browser.newContext()).newPage();
  await outro.goto(link);
  await expect(outro.getByText('venceu ou já foi usado')).toBeVisible();

  // O dono compartilha pela tela de cadastros.
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
