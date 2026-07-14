import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';
import { emitirParaImovel } from '../realtime.js';

export const despesasRouter = Router();
despesasRouter.use(autenticar);

const CATEGORIAS = ['AGUA', 'LUZ', 'IPTU', 'CONDOMINIO', 'MANUTENCAO', 'REFORMA', 'IMPOSTOS', 'OUTRO'] as const;

const despesaSchema = z.object({
  imovelId: z.string().min(1),
  dataPagamento: z.coerce.date(),
  categoria: z.enum(CATEGORIAS),
  descricao: z.string().min(1),
  fornecedor: z.string().optional(),
  valor: z.coerce.number().positive(),
  formaPagamento: z.enum(['PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO']),
  comprovanteUrl: z.string().url().optional(),
});

// GET /despesas?imovelId=...&categoria=...&de=...&ate=...
despesasRouter.get('/', async (req, res, next) => {
  try {
    const imovelId = z.string().min(1).parse(req.query.imovelId);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    const filtros = z
      .object({
        categoria: z.enum(CATEGORIAS).optional(),
        de: z.coerce.date().optional(),
        ate: z.coerce.date().optional(),
      })
      .parse(req.query);

    const despesas = await prisma.despesa.findMany({
      where: {
        imovelId,
        ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
        ...(filtros.de || filtros.ate
          ? { dataPagamento: { ...(filtros.de ? { gte: filtros.de } : {}), ...(filtros.ate ? { lte: filtros.ate } : {}) } }
          : {}),
      },
      orderBy: { dataPagamento: 'desc' },
    });
    res.json(despesas);
  } catch (err) {
    next(err);
  }
});

despesasRouter.post('/', async (req, res, next) => {
  try {
    const dados = despesaSchema.parse(req.body);
    await garantirAcessoImovel(req.usuario!.sub, dados.imovelId);
    const despesa = await prisma.despesa.create({ data: dados });
    emitirParaImovel(despesa.imovelId, 'despesa:criada', despesa);
    res.status(201).json(despesa);
  } catch (err) {
    next(err);
  }
});

despesasRouter.put('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.despesa.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Despesa não encontrada' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    const dados = despesaSchema.omit({ imovelId: true }).partial().parse(req.body);
    const despesa = await prisma.despesa.update({ where: { id: req.params.id }, data: dados });
    emitirParaImovel(despesa.imovelId, 'despesa:atualizada', despesa);
    res.json(despesa);
  } catch (err) {
    next(err);
  }
});

despesasRouter.delete('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.despesa.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Despesa não encontrada' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    await prisma.despesa.delete({ where: { id: req.params.id } });
    emitirParaImovel(existente.imovelId, 'despesa:removida', { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
