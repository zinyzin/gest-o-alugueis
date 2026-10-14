import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { limparBanco, criarUsuario, criarImovel, api } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { avisarFimDeContrato, avisarReajustes, gerarAlugueisDoMes, marcarAtrasos } from '../src/rotinas/rotinas.js';
import { hojeNoFuso, somarMeses } from '../src/rotinas/datas.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function contrato(dados: { dataInicio: string; dataFim?: string; diaVencimento?: number; dataUltimoReajuste?: string }) {
  const token = await criarUsuario(`dono-${Math.random()}@teste.com`);
  const auth = { Authorization: `Bearer ${token}` };
  const imovelId = await criarImovel(token);
  const inq = await api().post('/api/inquilinos').set(auth).send({ imovelId, nome: 'Ana' }).expect(201);
  const c = await api()
    .post('/api/contratos')
    .set(auth)
    .send({ imovelId, inquilinoId: inq.body.id, valorAluguel: 2000, diaVencimento: 10, ...dados })
    .expect(201);
  return { imovelId, contratoId: c.body.id as string, inquilinoId: inq.body.id as string };
}

describe('datas', () => {
  it('hoje é o dia no fuso informado, não o do servidor', () => {
    // 02:00 UTC de 15/03 ainda é 14/03 em São Paulo (UTC-3).
    expect(hojeNoFuso('America/Sao_Paulo', new Date('2026-03-15T02:00:00Z')).toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });
  it('somar meses respeita o fim do mês', () => {
    expect(somarMeses(dia('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
    expect(somarMeses(dia('2026-03-10'), 12).toISOString().slice(0, 10)).toBe('2027-03-10');
  });
});

describe('C1: aluguel do mês', () => {
  it('gera uma receita PENDENTE no dia do vencimento, sem duplicar', async () => {
    const c = await contrato({ dataInicio: '2026-01-01' });
    expect(await gerarAlugueisDoMes(dia('2026-03-02'))).toBe(1);
    expect(await gerarAlugueisDoMes(dia('2026-03-20'))).toBe(0);
    const receitas = await prisma.receita.findMany({ where: { contratoId: c.contratoId } });
    expect(receitas).toHaveLength(1);
    expect(receitas[0]).toMatchObject({ status: 'PENDENTE', competencia: '2026-03', inquilinoId: c.inquilinoId, descricao: 'Aluguel 03/2026' });
    expect(receitas[0].dataRecebimento.toISOString().slice(0, 10)).toBe('2026-03-10');
    expect(Number(receitas[0].valor)).toBe(2000);
  });

  it('vencimento dia 31 cai no último dia de fevereiro', async () => {
    const c = await contrato({ dataInicio: '2026-01-01', diaVencimento: 31 });
    await gerarAlugueisDoMes(dia('2026-02-01'));
    const r = await prisma.receita.findFirstOrThrow({ where: { contratoId: c.contratoId } });
    expect(r.dataRecebimento.toISOString().slice(0, 10)).toBe('2026-02-28');
  });

  it('não gera para contrato que ainda não começou, já terminou ou começou depois do vencimento', async () => {
    await contrato({ dataInicio: '2026-05-01' });
    await contrato({ dataInicio: '2025-01-01', dataFim: '2026-02-28' });
    await contrato({ dataInicio: '2026-03-15' }); // vence dia 10: primeiro aluguel é o de abril
    expect(await gerarAlugueisDoMes(dia('2026-03-20'))).toBe(0);
  });
});

describe('C2: atraso automático', () => {
  it('pendente vencida vira ATRASADO e gera um aviso, uma vez só', async () => {
    const c = await contrato({ dataInicio: '2026-01-01' });
    await gerarAlugueisDoMes(dia('2026-03-01'));
    expect(await marcarAtrasos(dia('2026-03-10'))).toBe(0); // no dia do vencimento ainda não atrasou
    expect(await marcarAtrasos(dia('2026-03-11'))).toBe(1);
    expect(await marcarAtrasos(dia('2026-03-12'))).toBe(0);
    const r = await prisma.receita.findFirstOrThrow({ where: { contratoId: c.contratoId } });
    expect(r.status).toBe('ATRASADO');
    expect(await prisma.notificacao.count({ where: { tipo: 'ALUGUEL_ATRASADO', imovelId: c.imovelId } })).toBe(1);
  });

  it('receita paga não vira atrasada', async () => {
    const c = await contrato({ dataInicio: '2026-01-01' });
    await gerarAlugueisDoMes(dia('2026-03-01'));
    await prisma.receita.updateMany({ where: { contratoId: c.contratoId }, data: { status: 'PAGO' } });
    expect(await marcarAtrasos(dia('2026-04-01'))).toBe(0);
  });
});

describe('C3: aviso de reajuste', () => {
  it('avisa aos 12 meses do início, uma vez por ciclo; reajuste novo reinicia a contagem', async () => {
    const c = await contrato({ dataInicio: '2025-03-10' });
    expect(await avisarReajustes(dia('2026-03-09'))).toBe(0);
    expect(await avisarReajustes(dia('2026-03-10'))).toBe(1);
    expect(await avisarReajustes(dia('2026-04-01'))).toBe(0);
    await prisma.contrato.update({ where: { id: c.contratoId }, data: { dataUltimoReajuste: dia('2026-03-15') } });
    expect(await avisarReajustes(dia('2027-03-14'))).toBe(0);
    expect(await avisarReajustes(dia('2027-03-15'))).toBe(1);
  });
});

describe('C4: fim de contrato', () => {
  it('avisa com 60 e com 30 dias, uma vez cada', async () => {
    await contrato({ dataInicio: '2025-01-01', dataFim: '2026-06-30' });
    expect(await avisarFimDeContrato(dia('2026-04-30'))).toBe(0); // 61 dias
    expect(await avisarFimDeContrato(dia('2026-05-01'))).toBe(1); // 60
    expect(await avisarFimDeContrato(dia('2026-05-15'))).toBe(0);
    expect(await avisarFimDeContrato(dia('2026-05-31'))).toBe(1); // 30
    expect(await avisarFimDeContrato(dia('2026-06-20'))).toBe(0);
    expect(await prisma.notificacao.count({ where: { tipo: 'CONTRATO_VENCENDO' } })).toBe(2);
  });
});

describe('aplicar reajuste', () => {
  it('calcula o novo valor pelo percentual, registra a data e respeita o acesso', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const intruso = await criarUsuario('intruso@teste.com');
    const auth = { Authorization: `Bearer ${dono}` };
    const imovelId = await criarImovel(dono);
    const inq = await api().post('/api/inquilinos').set(auth).send({ imovelId, nome: 'Ana' }).expect(201);
    const c = await api()
      .post('/api/contratos')
      .set(auth)
      .send({ imovelId, inquilinoId: inq.body.id, dataInicio: '2025-01-01', valorAluguel: 2000, diaVencimento: 10 })
      .expect(201);
    await api().post(`/api/contratos/${c.body.id}/reajuste`).set('Authorization', `Bearer ${intruso}`).send({ percentual: 5 }).expect(403);
    await api().post(`/api/contratos/${c.body.id}/reajuste`).set(auth).send({ percentual: 500 }).expect(400);
    const r = await api().post(`/api/contratos/${c.body.id}/reajuste`).set(auth).send({ percentual: 4.567 }).expect(200);
    expect(Number(r.body.valorAluguel)).toBe(2091.34);
    expect(r.body.dataUltimoReajuste).toBeTruthy();
  });
});
