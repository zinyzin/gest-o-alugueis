import { expect, test } from '@playwright/test';
import { campo, entrar, prepararUsuario } from './apoio';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b40000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

test('fotos do imóvel: enviar, ampliar e remover', async ({ page }) => {
  const u = await prepararUsuario('fotos');
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/cadastros`);
  await page.getByLabel(/Adicionar fotos/).setInputFiles([
    { name: 'sala.png', mimeType: 'image/png', buffer: PNG },
    { name: 'quarto.png', mimeType: 'image/png', buffer: PNG },
  ]);
  const galeria = page.locator('.galeria figure');
  await expect(galeria).toHaveCount(2);

  await page.getByRole('button', { name: 'Ampliar foto 1' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Foto do imóvel' });
  await expect(dialogo.locator('img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);

  page.once('dialog', (d) => d.accept());
  await galeria.first().getByRole('button', { name: 'Remover' }).click();
  await expect(galeria).toHaveCount(1);
});

test('comprovante em PDF abre na própria tela; arquivo falso é recusado', async ({ page }) => {
  const u = await prepararUsuario('compr');
  await entrar(page, u.email, u.senha);
  await page.goto(`/imoveis/${u.imovelId}/lancamentos`);
  const form = page.locator('form', { has: page.getByRole('heading', { name: 'Nova despesa' }) });
  await campo(form, 'Descrição').fill('Conserto');
  await campo(form, 'Valor (R$)').fill('300');
  await campo(form, 'Comprovante (JPG/PNG/PDF, opcional)').setInputFiles({ name: 'nota.pdf', mimeType: 'application/pdf', buffer: PDF });
  await form.getByRole('button', { name: 'Adicionar despesa' }).click();

  await page.locator('.list-item', { hasText: 'Conserto' }).getByRole('button', { name: 'ver comprovante' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Comprovante: Conserto' });
  await expect(dialogo.locator('iframe')).toHaveAttribute('src', /^\/arquivos\/[\w-]+\.pdf$/);
  await dialogo.getByRole('button', { name: 'Fechar' }).click();

  await campo(form, 'Descrição').fill('Falso');
  await campo(form, 'Valor (R$)').fill('10');
  await campo(form, 'Comprovante (JPG/PNG/PDF, opcional)').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('<html></html>') });
  await form.getByRole('button', { name: 'Adicionar despesa' }).click();
  await expect(form.locator('.erro')).toContainText('Tipo de arquivo não permitido');
});
