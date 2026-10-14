import { expect, test } from '@playwright/test';
import { entrar, prepararUsuario } from './apoio';

test('reajustar contrato mostra o novo valor e aplica após confirmar', async ({ page }) => {
  const u = await prepararUsuario('reaj');
  const API = 'http://localhost:3334/api';
  const inq = await (await u.ctx.post(`${API}/inquilinos`, { headers: u.auth, data: { imovelId: u.imovelId, nome: 'Bruno' } })).json();
  await u.ctx.post(`${API}/contratos`, {
    headers: u.auth,
    data: { imovelId: u.imovelId, inquilinoId: inq.id, dataInicio: '2025-01-01', valorAluguel: 2000, diaVencimento: 10, indiceReajuste: 'IPCA' },
  });
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/cadastros`);
  const cardContratos = page.locator('.card', { has: page.getByRole('heading', { name: 'Contratos' }) });
  const linha = cardContratos.locator('.list-item', { hasText: 'Bruno' });
  await linha.getByRole('button', { name: 'Reajustar' }).click();
  await linha.getByPlaceholder('ex.: 4,5').fill('4,5');
  await expect(linha).toContainText('Novo valor: R$ 2.090,00');

  // Recusar a confirmação não muda nada.
  page.once('dialog', (d) => d.dismiss());
  await linha.getByRole('button', { name: 'Aplicar reajuste' }).click();
  await expect(linha).toContainText('2.000,00');

  page.once('dialog', (d) => d.accept());
  await linha.getByRole('button', { name: 'Aplicar reajuste' }).click();
  await expect(linha).toContainText('2.090,00');
  await expect(linha).toContainText('reajustado em');
  await expect(linha.getByRole('button', { name: 'Aplicar reajuste' })).toHaveCount(0);
});
