import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { entrar, prepararUsuario } from './apoio';

test('relatórios batem com a API e o CSV é baixado', async ({ page }) => {
  const u = await prepararUsuario('rel');
  const API = 'http://localhost:3334/api';
  const ano = new Date().getFullYear();
  const lancar = (rota: string, data: object) => u.ctx.post(`${API}/${rota}`, { headers: u.auth, data: { imovelId: u.imovelId, ...data } });
  await lancar('receitas', { dataRecebimento: `${ano}-03-10`, descricao: 'Aluguel março', valor: 2000, formaPagamento: 'PIX', status: 'PAGO' });
  await lancar('receitas', { dataRecebimento: `${ano}-04-10`, descricao: 'Aluguel abril', valor: 2000, formaPagamento: 'PIX', status: 'ATRASADO' });
  await lancar('despesas', { dataPagamento: `${ano}-03-15`, categoria: 'IPTU', descricao: 'IPTU', valor: 350, formaPagamento: 'BOLETO' });
  const fluxoApi = await (await u.ctx.get(`${API}/relatorios/fluxo-caixa?imovelId=${u.imovelId}&ano=${ano}`, { headers: u.auth })).json();
  expect(fluxoApi.meses[2]).toMatchObject({ receitas: 2000, despesas: 350, saldo: 1650 });

  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/relatorios`);

  const marco = page.locator('tbody tr', { hasText: 'mar' });
  await expect(marco).toContainText('2.000,00');
  await expect(marco).toContainText('350,00');
  await expect(marco).toContainText('1.650,00');
  await expect(page.locator('tfoot')).toContainText('4.000,00');

  const cardInad = page.locator('.card', { has: page.getByRole('heading', { name: 'Inadimplência' }) });
  await expect(cardInad).toContainText('Aluguel abril');
  await expect(cardInad).not.toContainText('Aluguel março');

  // Ano anterior: tudo zerado.
  await page.getByRole('button', { name: 'Ano anterior' }).click();
  await expect(page.locator('tfoot')).not.toContainText('4.000,00');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar receitas' }).click()]);
  expect(download.suggestedFilename()).toBe('receitas.csv');
  const conteudo = readFileSync((await download.path())!, 'utf-8');
  expect(conteudo).toContain('Aluguel março');
  expect(conteudo.split('\n')[0]).toBe('data,descricao,valor,forma_pagamento,status');
});
