import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';

export const dashboardRouter = Router();
dashboardRouter.use(autenticar);

const num = (v: unknown) => Number(v ?? 0);

// GET /dashboard?imovelId=...&de=...&ate=...
// Resumo: total de receitas/despesas, saldo (lucro/prejuízo), quebras por
// status (receitas) e por categoria (despesas).
dashboardRouter.get('/', async (req, res, next) => {
  try {
    const { imovelId, de, ate } = z
      .object({
        imovelId: z.string().min(1),
        de: z.coerce.date().optional(),
        ate: z.coerce.date().optional(),
      })
      .parse(req.query);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    const periodoReceita = de || ate ? { dataRecebimento: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {};
    const periodoDespesa = de || ate ? { dataPagamento: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } } : {};

    const [receitasSum, despesasSum, receitasPorStatus, despesasPorCategoria] = await Promise.all([
      prisma.receita.aggregate({ where: { imovelId, ...periodoReceita }, _sum: { valor: true } }),
      prisma.despesa.aggregate({ where: { imovelId, ...periodoDespesa }, _sum: { valor: true } }),
      prisma.receita.groupBy({
        by: ['status'],
        where: { imovelId, ...periodoReceita },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.despesa.groupBy({
        by: ['categoria'],
        where: { imovelId, ...periodoDespesa },
        _sum: { valor: true },
        _count: true,
      }),
    ]);

    const totalReceitas = num(receitasSum._sum.valor);
    const totalDespesas = num(despesasSum._sum.valor);

    res.json({
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      receitasPorStatus: receitasPorStatus.map((r) => ({ status: r.status, total: num(r._sum.valor), qtd: r._count })),
      despesasPorCategoria: despesasPorCategoria.map((d) => ({ categoria: d.categoria, total: num(d._sum.valor), qtd: d._count })),
    });
  } catch (err) {
    next(err);
  }
});
