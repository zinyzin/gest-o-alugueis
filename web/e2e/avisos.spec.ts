import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { entrar, prepararUsuario } from './apoio';

const DATABASE_URL = 'postgresql://gestao:gestao@localhost:5433/gestao_imovel_test?schema=public';

// Cria um aviso direto no banco de teste, como as rotinas fariam (a entrega ao vivo pelo
// socket é coberta pelos testes do backend).
function criarAviso(imovelId: string, titulo: string) {
  const sql = `INSERT INTO notificacoes (id, imovel_id, tipo, titulo, mensagem, chave) VALUES ('${'n' + Date.now()}', '${imovelId}', 'REAJUSTE', '${titulo}', 'Aplique o reajuste.', 'e2e:${Date.now()}:${Math.random()}')`;
  execSync(`docker exec gestao-imovel-pg psql -U gestao -d gestao_imovel_test -c "${sql}"`, { stdio: 'ignore', env: { ...process.env, DATABASE_URL } });
}

test('sininho mostra avisos não lidos, abre o imóvel e marca como lido', async ({ page }) => {
  const u = await prepararUsuario('aviso');
  criarAviso(u.imovelId, 'Reajuste do aluguel');
  criarAviso(u.imovelId, 'Contrato perto do fim');
  await entrar(page, u.email, u.senha);

  const sino = page.getByRole('button', { name: /Avisos/ });
  await expect(sino).toHaveAccessibleName('Avisos: 2 não lidos');
  await sino.click();
  const lista = page.getByRole('dialog', { name: 'Avisos' });
  await expect(lista).toContainText('Reajuste do aluguel');
  await expect(lista).toContainText('Contrato perto do fim');

  await lista.getByRole('button', { name: /Reajuste do aluguel/ }).click();
  await expect(page).toHaveURL(new RegExp(`/imoveis/${u.imovelId}/cadastros`));
  await expect(sino).toHaveAccessibleName('Avisos: 1 não lido');

  await sino.click();
  await page.getByRole('button', { name: 'Marcar todos como lidos' }).click();
  await expect(sino).toHaveAccessibleName('Avisos');
});
