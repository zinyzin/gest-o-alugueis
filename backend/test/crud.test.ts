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

describe('edição', () => {
  it('null limpa campos opcionais de inquilino, contrato e despesa', async () => {
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    const imovelId = await criarImovel(token);
    const inq = await api().post('/api/inquilinos').set(auth).send({ imovelId, nome: 'Ana', telefone: '1199' }).expect(201);
    const ctr = await api()
      .post('/api/contratos')
      .set(auth)
      .send({ imovelId, inquilinoId: inq.body.id, dataInicio: '2026-01-01', dataFim: '2027-01-01', valorAluguel: 2000, diaVencimento: 10, valorCaucao: 4000 })
      .expect(201);
    const desp = await api()
      .post('/api/despesas')
      .set(auth)
      .send({ imovelId, dataPagamento: '2026-02-05', categoria: 'LUZ', descricao: 'Luz', fornecedor: 'Enel', valor: 100, formaPagamento: 'PIX' })
      .expect(201);

    const i = await api().put(`/api/inquilinos/${inq.body.id}`).set(auth).send({ telefone: null }).expect(200);
    expect(i.body.telefone).toBeNull();
    const c = await api().put(`/api/contratos/${ctr.body.id}`).set(auth).send({ dataFim: null, valorCaucao: null }).expect(200);
    expect(c.body.dataFim).toBeNull();
    expect(c.body.valorCaucao).toBeNull();
    const d = await api().put(`/api/despesas/${desp.body.id}`).set(auth).send({ fornecedor: null }).expect(200);
    expect(d.body.fornecedor).toBeNull();
  });

  it('recusa vincular receita a inquilino de outro imóvel', async () => {
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    const imovelA = await criarImovel(token, 'Rua A, 1');
    const imovelB = await criarImovel(token, 'Rua B, 2');
    const inqB = await api().post('/api/inquilinos').set(auth).send({ imovelId: imovelB, nome: 'De B' }).expect(201);
    const rec = await api()
      .post('/api/receitas')
      .set(auth)
      .send({ imovelId: imovelA, dataRecebimento: '2026-02-10', descricao: 'Aluguel', valor: 1000, formaPagamento: 'PIX' })
      .expect(201);
    await api().put(`/api/receitas/${rec.body.id}`).set(auth).send({ inquilinoId: inqB.body.id }).expect(400);
    const limpo = await api().put(`/api/receitas/${rec.body.id}`).set(auth).send({ inquilinoId: null }).expect(200);
    expect(limpo.body.inquilinoId).toBeNull();
  });
});

describe('exportação CSV', () => {
  it('neutraliza fórmulas e escapa vírgulas e aspas', async () => {
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    const imovelId = await criarImovel(token);
    for (const descricao of ['=HYPERLINK("http://x","clique")', 'Aluguel, março', '@SUM(A1)']) {
      await api()
        .post('/api/receitas')
        .set(auth)
        .send({ imovelId, dataRecebimento: '2026-02-10', descricao, valor: 10, formaPagamento: 'PIX' })
        .expect(201);
    }
    const res = await api().get(`/api/relatorios/export.csv?imovelId=${imovelId}&tipo=receitas`).set(auth).expect(200);
    expect(res.text).toContain(`"'=HYPERLINK(""http://x"",""clique"")"`);
    expect(res.text).toContain('"Aluguel, março"');
    expect(res.text).toContain("'@SUM(A1)");
    expect(res.text).not.toMatch(/(^|,)[=@]/m);
  });
});
