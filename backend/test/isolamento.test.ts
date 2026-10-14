import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, criarImovel } from './helpers.js';
import { prisma } from '../src/prisma.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

// Monta: dono com um imóvel completo (inquilino, contrato, receita, despesa) e um intruso sem vínculo.
async function cenario() {
  const dono = await criarUsuario('dono@teste.com');
  const intruso = await criarUsuario('intruso@teste.com');
  const imovelId = await criarImovel(dono);
  const auth = { Authorization: `Bearer ${dono}` };
  const inq = await api().post('/api/inquilinos').set(auth).send({ imovelId, nome: 'Inquilino' }).expect(201);
  const contrato = await api()
    .post('/api/contratos')
    .set(auth)
    .send({ imovelId, inquilinoId: inq.body.id, dataInicio: '2026-01-01', valorAluguel: 2000, diaVencimento: 10 })
    .expect(201);
  const receita = await api()
    .post('/api/receitas')
    .set(auth)
    .send({ imovelId, dataRecebimento: '2026-02-10', descricao: 'Aluguel', valor: 2000, formaPagamento: 'PIX' })
    .expect(201);
  const despesa = await api()
    .post('/api/despesas')
    .set(auth)
    .send({ imovelId, dataPagamento: '2026-02-05', categoria: 'IPTU', descricao: 'IPTU', valor: 300, formaPagamento: 'BOLETO' })
    .expect(201);
  return {
    dono,
    intruso: { Authorization: `Bearer ${intruso}` },
    imovelId,
    ids: { inquilino: inq.body.id, contrato: contrato.body.id, receita: receita.body.id, despesa: despesa.body.id },
  };
}

describe('isolamento entre usuários', () => {
  it('intruso não vê o imóvel na lista nem por id', async () => {
    const c = await cenario();
    const lista = await api().get('/api/imoveis').set(c.intruso).expect(200);
    expect(lista.body).toEqual([]);
    await api().get(`/api/imoveis/${c.imovelId}`).set(c.intruso).expect(403);
  });

  it('intruso recebe 403 ao listar qualquer recurso do imóvel', async () => {
    const c = await cenario();
    for (const rota of ['inquilinos', 'contratos', 'receitas', 'despesas', 'dashboard']) {
      await api().get(`/api/${rota}?imovelId=${c.imovelId}`).set(c.intruso).expect(403);
    }
    for (const rel of ['fluxo-caixa', 'inadimplencia', 'export.csv?tipo=receitas', 'export.csv?tipo=despesas']) {
      const sep = rel.includes('?') ? '&' : '?';
      await api().get(`/api/relatorios/${rel}${sep}imovelId=${c.imovelId}`).set(c.intruso).expect(403);
    }
  });

  it('intruso não altera nem apaga registros do imóvel', async () => {
    const c = await cenario();
    await api().put(`/api/imoveis/${c.imovelId}`).set(c.intruso).send({ endereco: 'x' }).expect(403);
    await api().put(`/api/inquilinos/${c.ids.inquilino}`).set(c.intruso).send({ nome: 'x' }).expect(403);
    await api().put(`/api/contratos/${c.ids.contrato}`).set(c.intruso).send({ valorAluguel: 1 }).expect(403);
    await api().put(`/api/receitas/${c.ids.receita}`).set(c.intruso).send({ valor: 1 }).expect(403);
    await api().put(`/api/despesas/${c.ids.despesa}`).set(c.intruso).send({ valor: 1 }).expect(403);
    await api().delete(`/api/receitas/${c.ids.receita}`).set(c.intruso).expect(403);
    await api().delete(`/api/despesas/${c.ids.despesa}`).set(c.intruso).expect(403);
    await api().delete(`/api/contratos/${c.ids.contrato}`).set(c.intruso).expect(403);
    await api().delete(`/api/inquilinos/${c.ids.inquilino}`).set(c.intruso).expect(403);
    await api().delete(`/api/imoveis/${c.imovelId}`).set(c.intruso).expect(403);
    // Nada foi alterado nem apagado.
    expect((await prisma.imovel.findUnique({ where: { id: c.imovelId } }))?.endereco).toBe('Rua Teste, 1');
    expect((await prisma.inquilino.findUnique({ where: { id: c.ids.inquilino } }))?.nome).toBe('Inquilino');
    expect(Number((await prisma.contrato.findUnique({ where: { id: c.ids.contrato } }))?.valorAluguel)).toBe(2000);
    expect(Number((await prisma.receita.findUnique({ where: { id: c.ids.receita } }))?.valor)).toBe(2000);
    expect(Number((await prisma.despesa.findUnique({ where: { id: c.ids.despesa } }))?.valor)).toBe(300);
  });

  it('intruso não cria registros no imóvel alheio nem se autocompartilha', async () => {
    const c = await cenario();
    await api()
      .post('/api/receitas')
      .set(c.intruso)
      .send({ imovelId: c.imovelId, dataRecebimento: '2026-03-10', descricao: 'x', valor: 1, formaPagamento: 'PIX' })
      .expect(403);
    await api().post('/api/inquilinos').set(c.intruso).send({ imovelId: c.imovelId, nome: 'x' }).expect(403);
    await api()
      .post('/api/contratos')
      .set(c.intruso)
      .send({ imovelId: c.imovelId, inquilinoId: c.ids.inquilino, dataInicio: '2026-01-01', valorAluguel: 1, diaVencimento: 5 })
      .expect(403);
    await api()
      .post('/api/despesas')
      .set(c.intruso)
      .send({ imovelId: c.imovelId, dataPagamento: '2026-03-05', categoria: 'LUZ', descricao: 'x', valor: 1, formaPagamento: 'PIX' })
      .expect(403);
    await api().post(`/api/imoveis/${c.imovelId}/compartilhar`).set(c.intruso).send({ email: 'intruso@teste.com' }).expect(403);
  });

  it('depois de compartilhado, o outro usuário passa a acessar', async () => {
    const c = await cenario();
    await api()
      .post(`/api/imoveis/${c.imovelId}/compartilhar`)
      .set('Authorization', `Bearer ${c.dono}`)
      .send({ email: 'intruso@teste.com' })
      .expect(204);
    await api().get(`/api/receitas?imovelId=${c.imovelId}`).set(c.intruso).expect(200);
  });
});
