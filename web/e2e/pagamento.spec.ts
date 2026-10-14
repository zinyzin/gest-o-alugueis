import { expect, test } from '@playwright/test';
import { entrar, prepararUsuario } from './apoio';

test('marcar receita pendente como paga com um clique', async ({ page }) => {
  const u = await prepararUsuario('pago');
  await u.ctx.post('http://localhost:3334/api/receitas', {
    headers: u.auth,
    data: { imovelId: u.imovelId, dataRecebimento: '2026-03-10', descricao: 'Aluguel abril', valor: 1500, formaPagamento: 'PIX', status: 'PENDENTE' },
  });
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/lancamentos`);
  const linha = page.locator('.list-item', { hasText: 'Aluguel abril' });
  await expect(linha).toContainText('PENDENTE');
  await linha.getByRole('button', { name: 'Marcar pago' }).click();
  await expect(linha).toContainText('PAGO');
  await expect(linha.getByRole('button', { name: 'Marcar pago' })).toHaveCount(0);
});
