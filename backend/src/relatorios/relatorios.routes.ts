import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';

export const relatoriosRouter = Router();
relatoriosRouter.use(autenticar);

const num = (v: unknown) => Number(v ?? 0);

// GET /relatorios/fluxo-caixa?imovelId=...&ano=2026
// Fluxo de caixa mensal (12 meses): receitas, despesas e saldo por mês.
relatoriosRouter.get('/fluxo-caixa', async (req, res, next) => {
  try {
    const { imovelId, ano } = z
      .object({ imovelId: z.string().min(1), ano: z.coerce.number().int().default(new Date().getFullYear()) })
      .parse(req.query);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    const inicio = new Date(Date.UTC(ano, 0, 1));
    const fim = new Date(Date.UTC(ano + 1, 0, 1));

    const [receitas, despesas] = await Promise.all([
      prisma.receita.findMany({ where: { imovelId, dataRecebimento: { gte: inicio, lt: fim } }, select: { dataRecebimento: true, valor: true } }),
      prisma.despesa.findMany({ where: { imovelId, dataPagamento: { gte: inicio, lt: fim } }, select: { dataPagamento: true, valor: true } }),
    ]);

    const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, receitas: 0, despesas: 0, saldo: 0 }));
    for (const r of receitas) meses[r.dataRecebimento.getUTCMonth()].receitas += num(r.valor);
    for (const d of despesas) meses[d.dataPagamento.getUTCMonth()].despesas += num(d.valor);
    for (const m of meses) m.saldo = m.receitas - m.despesas;

    res.json({ ano, meses });
  } catch (err) {
    next(err);
  }
});

// GET /relatorios/inadimplencia?imovelId=...
// Receitas com status ATRASADO ou PENDENTE.
relatoriosRouter.get('/inadimplencia', async (req, res, next) => {
  try {
    const imovelId = z.string().min(1).parse(req.query.imovelId);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    const pendencias = await prisma.receita.findMany({
      where: { imovelId, status: { in: ['ATRASADO', 'PENDENTE'] } },
      include: { inquilino: { select: { id: true, nome: true } } },
      orderBy: { dataRecebimento: 'asc' },
    });

    const total = pendencias.reduce((s, r) => s + num(r.valor), 0);
    res.json({ total, quantidade: pendencias.length, pendencias });
  } catch (err) {
    next(err);
  }
});

// GET /relatorios/export.csv?imovelId=...&tipo=receitas|despesas
relatoriosRouter.get('/export.csv', async (req, res, next) => {
  try {
    const { imovelId, tipo } = z
      .object({ imovelId: z.string().min(1), tipo: z.enum(['receitas', 'despesas']) })
      .parse(req.query);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    let linhas: string[];
    if (tipo === 'receitas') {
      const receitas = await prisma.receita.findMany({ where: { imovelId }, orderBy: { dataRecebimento: 'desc' } });
      linhas = ['data,descricao,valor,forma_pagamento,status'];
      for (const r of receitas) {
        linhas.push([iso(r.dataRecebimento), csv(r.descricao), num(r.valor), r.formaPagamento, r.status].join(','));
      }
    } else {
      const despesas = await prisma.despesa.findMany({ where: { imovelId }, orderBy: { dataPagamento: 'desc' } });
      linhas = ['data,categoria,descricao,fornecedor,valor,forma_pagamento'];
      for (const d of despesas) {
        linhas.push([iso(d.dataPagamento), d.categoria, csv(d.descricao), csv(d.fornecedor ?? ''), num(d.valor), d.formaPagamento].join(','));
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${tipo}.csv"`);
    res.send(linhas.join('\n'));
  } catch (err) {
    next(err);
  }
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
// Escapa campos de texto para CSV (aspas e vírgulas).
const csv = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
