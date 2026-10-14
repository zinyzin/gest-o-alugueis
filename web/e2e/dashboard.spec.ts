import { expect, test } from '@playwright/test';
import { entrar, prepararUsuario } from './apoio';

test('dashboard: filtro de período, gráfico mensal com dica e categorias', async ({ page }, info) => {
  const u = await prepararUsuario('dash');
  const API = 'http://localhost:3334/api';
  const ano = new Date().getFullYear();
  const lancar = (rota: string, data: object) => u.ctx.post(`${API}/${rota}`, { headers: u.auth, data: { imovelId: u.imovelId, ...data } });
  for (const [mes, valor] of [['01', 2000], ['02', 2000], ['03', 2100], ['05', 2100]] as const) {
    await lancar('receitas', { dataRecebimento: `${ano}-${mes}-10`, descricao: `Aluguel ${mes}`, valor, formaPagamento: 'PIX', status: 'PAGO' });
  }
  await lancar('despesas', { dataPagamento: `${ano}-02-05`, categoria: 'IPTU', descricao: 'IPTU', valor: 900, formaPagamento: 'BOLETO' });
  await lancar('despesas', { dataPagamento: `${ano}-03-15`, categoria: 'MANUTENCAO', descricao: 'Pintura', valor: 1450, formaPagamento: 'PIX' });
  await lancar('receitas', { dataRecebimento: `${ano - 1}-12-10`, descricao: 'Aluguel antigo', valor: 1800, formaPagamento: 'PIX', status: 'PAGO' });

  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}`);

  // "Este ano" é o padrão: o lançamento do ano anterior fica de fora.
  const receitas = page.locator('.stat', { hasText: 'Receitas' });
  await expect(receitas).toContainText('8.200,00');
  await page.getByLabel('Período').selectOption('tudo');
  await expect(receitas).toContainText('10.000,00');
  await page.getByLabel('Período').selectOption('ano-anterior');
  await expect(receitas).toContainText('1.800,00');
  await page.getByLabel('Período').selectOption('ano');

  // Dica ao passar o mouse (ou focar) no mês.
  const marco = page.getByRole('img', { name: 'Receitas e despesas por mês' }).locator('rect[tabindex]').nth(2);
  await marco.hover();
  const dica = page.getByRole('status');
  await expect(dica).toContainText('mar');
  await expect(dica).toContainText('2.100,00');
  await expect(dica).toContainText('1.450,00');
  await expect(dica).toContainText('650,00');

  await page.screenshot({ path: info.outputPath('dashboard-claro.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await marco.hover();
  await page.screenshot({ path: info.outputPath('dashboard-escuro.png'), fullPage: true });
});
