import { expect, test } from '@playwright/test';
import { campo, entrar, prepararUsuario } from './apoio';

test('editar e excluir inquilino e contrato; limpar campo opcional', async ({ page }) => {
  const u = await prepararUsuario('cad');
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/cadastros`);

  const formInq = page.locator('form', { has: page.getByRole('heading', { name: 'Novo inquilino' }) });
  await campo(formInq, 'Nome completo').fill('Maria Souza');
  await campo(formInq, 'Telefone (opcional)').fill('11 99999-0000');
  await formInq.getByRole('button', { name: 'Adicionar inquilino' }).click();
  const linhaInq = page.locator('.list-item', { hasText: 'Maria Souza' });
  await expect(linhaInq).toContainText('11 99999-0000');

  // Edita o nome e apaga o telefone.
  await linhaInq.getByRole('button', { name: 'Editar' }).click();
  const edInq = page.locator('form', { has: page.getByRole('heading', { name: 'Editar inquilino' }) });
  await campo(edInq, 'Nome completo').fill('Maria S. Lima');
  await campo(edInq, 'Telefone (opcional)').fill('');
  await edInq.getByRole('button', { name: 'Salvar alterações' }).click();
  const cardInquilinos = page.locator('.card', { has: page.getByRole('heading', { name: 'Inquilinos', exact: true }) });
  const linhaInq2 = cardInquilinos.locator('.list-item', { hasText: 'Maria S. Lima' });
  await expect(linhaInq2).toBeVisible();
  await expect(linhaInq2).not.toContainText('99999');

  // Contrato com término; na edição, o término é apagado e o valor muda.
  const formCtr = page.locator('form', { has: page.getByRole('heading', { name: 'Novo contrato' }) });
  await campo(formCtr, 'Inquilino').selectOption({ label: 'Maria S. Lima' });
  await campo(formCtr, 'Início').fill('2026-01-01');
  await campo(formCtr, 'Término (opcional)').fill('2027-01-01');
  await campo(formCtr, 'Valor do aluguel (R$)').fill('2000');
  await formCtr.getByRole('button', { name: 'Adicionar contrato' }).click();
  const cardContratos = page.locator('.card', { has: page.getByRole('heading', { name: 'Contratos' }) });
  const linhaCtr = cardContratos.locator('.list-item', { hasText: 'Maria S. Lima' });
  await expect(linhaCtr).toContainText('2027-01-01');

  await linhaCtr.getByRole('button', { name: 'Editar' }).click();
  const edCtr = page.locator('form', { has: page.getByRole('heading', { name: 'Editar contrato' }) });
  await expect(campo(edCtr, 'Inquilino')).toBeDisabled();
  await campo(edCtr, 'Término (opcional)').fill('');
  await campo(edCtr, 'Valor do aluguel (R$)').fill('2200');
  await edCtr.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(linhaCtr).toContainText('2.200,00');
  await expect(linhaCtr).not.toContainText('2027-01-01');

  // Excluir o inquilino leva o contrato junto.
  page.once('dialog', (d) => d.accept());
  await linhaInq2.getByRole('button', { name: 'Excluir' }).click();
  await expect(linhaInq2).toHaveCount(0);
  await expect(cardContratos).toContainText('Nenhum contrato.');
});

test('editar e excluir imóvel', async ({ page }) => {
  const u = await prepararUsuario('imo');
  await entrar(page, u.email, u.senha);
  const linha = page.locator('.list-item').first();
  await linha.getByRole('button', { name: 'Editar' }).click();
  await expect(page).toHaveURL('/'); // o botão não abre o imóvel
  const form = page.locator('form', { has: page.getByRole('heading', { name: 'Editar imóvel' }) });
  await campo(form, 'Endereço').fill('Av. Nova, 500');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.list-item', { hasText: 'Av. Nova, 500' })).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.locator('.list-item', { hasText: 'Av. Nova, 500' }).getByRole('button', { name: 'Excluir' }).click();
  await expect(page.getByText('Nenhum imóvel ainda')).toBeVisible();
});
