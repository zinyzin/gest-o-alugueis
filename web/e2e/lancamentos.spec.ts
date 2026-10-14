import { expect, test } from '@playwright/test';
import { campo, entrar, prepararUsuario } from './apoio';

test('editar e excluir receita e despesa, com reflexo ao vivo em outra sessão', async ({ page, browser }) => {
  const u = await prepararUsuario('lanc');
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/lancamentos`);

  // Segunda sessão do mesmo usuário, para conferir o tempo real.
  const outra = await (await browser.newContext()).newPage();
  await entrar(outra, u.email, u.senha);
  await outra.goto(`/imoveis/${u.imovelId}/lancamentos`);

  // Cria uma receita.
  const formReceita = page.locator('form', { has: page.getByRole('heading', { name: 'Nova receita' }) });
  await campo(formReceita, 'Descrição').fill('Aluguel março');
  await campo(formReceita, 'Valor (R$)').fill('2000');
  await formReceita.getByRole('button', { name: 'Adicionar receita' }).click();
  const linha = page.locator('.list-item', { hasText: 'Aluguel março' });
  await expect(linha).toContainText('2.000,00');

  // Edita: o formulário vira "Editar receita" e salva o novo valor.
  await linha.getByRole('button', { name: 'Editar' }).click();
  const formEdicao = page.locator('form', { has: page.getByRole('heading', { name: 'Editar receita' }) });
  await expect(campo(formEdicao, 'Descrição')).toHaveValue('Aluguel março');
  await campo(formEdicao, 'Valor (R$)').fill('2500');
  await formEdicao.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(linha).toContainText('2.500,00');
  await expect(page.getByRole('heading', { name: 'Nova receita' })).toBeVisible();
  await expect(outra.locator('.list-item', { hasText: 'Aluguel março' })).toContainText('2.500,00');

  // Cria e edita uma despesa.
  const formDespesa = page.locator('form', { has: page.getByRole('heading', { name: 'Nova despesa' }) });
  await campo(formDespesa, 'Descrição').fill('Conta de luz');
  await campo(formDespesa, 'Valor (R$)').fill('180');
  await formDespesa.getByRole('button', { name: 'Adicionar despesa' }).click();
  const linhaDespesa = page.locator('.list-item', { hasText: 'Conta de luz' });
  await linhaDespesa.getByRole('button', { name: 'Editar' }).click();
  const formEdDespesa = page.locator('form', { has: page.getByRole('heading', { name: 'Editar despesa' }) });
  await campo(formEdDespesa, 'Valor (R$)').fill('200');
  await formEdDespesa.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(linhaDespesa).toContainText('200,00');

  // Cancelar a edição não altera nada.
  await linhaDespesa.getByRole('button', { name: 'Editar' }).click();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.getByRole('heading', { name: 'Nova despesa' })).toBeVisible();

  // Exclui a receita confirmando o aviso; recusar o aviso mantém a despesa.
  page.once('dialog', (d) => d.accept());
  await linha.getByRole('button', { name: 'Excluir' }).click();
  await expect(linha).toHaveCount(0);
  await expect(outra.locator('.list-item', { hasText: 'Aluguel março' })).toHaveCount(0);

  page.once('dialog', (d) => d.dismiss());
  await linhaDespesa.getByRole('button', { name: 'Excluir' }).click();
  await expect(linhaDespesa).toHaveCount(1);

  // O dashboard reflete o que sobrou: só a despesa de 200.
  await page.goto(`/imoveis/${u.imovelId}`);
  await expect(page.locator('body')).toContainText('200,00');
});
