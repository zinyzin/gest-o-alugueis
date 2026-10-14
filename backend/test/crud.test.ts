import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, criarImovel } from './helpers.js';
import { prisma } from '../src/prisma.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('lançamentos e dashboard', () => {
  it('receitas e despesas refletem no dashboard; edição e exclusão também', async () => {
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    const imovelId = await criarImovel(token);

    const r = await api()
      .post('/api/receitas')
      .set(auth)
      .send({ imovelId, dataRecebimento: '2026-02-10', descricao: 'Aluguel', valor: 2000, formaPagamento: 'PIX', status: 'PAGO' })
      .expect(201);
    const d = await api()
      .post('/api/despesas')
      .set(auth)
      .send({ imovelId, dataPagamento: '2026-02-05', categoria: 'IPTU', descricao: 'IPTU', valor: 300, formaPagamento: 'BOLETO' })
      .expect(201);

    let dash = await api().get(`/api/dashboard?imovelId=${imovelId}`).set(auth).expect(200);
    expect(JSON.stringify(dash.body)).toContain('1700');

    await api().put(`/api/receitas/${r.body.id}`).set(auth).send({ valor: 2500 }).expect(200);
    await api().delete(`/api/despesas/${d.body.id}`).set(auth).expect(204);
    dash = await api().get(`/api/dashboard?imovelId=${imovelId}`).set(auth).expect(200);
    expect(JSON.stringify(dash.body)).toContain('2500');
  });

  it('valida os dados de entrada', async () => {
    const token = await criarUsuario('dono@teste.com');
    const imovelId = await criarImovel(token);
    await api()
      .post('/api/receitas')
      .set('Authorization', `Bearer ${token}`)
      .send({ imovelId, dataRecebimento: '2026-02-10', descricao: 'x', valor: -5, formaPagamento: 'PIX' })
      .expect(400);
  });
});
