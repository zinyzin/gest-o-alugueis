import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';
import { emitirParaImovel } from '../realtime.js';

export const receitasRouter = Router();
receitasRouter.use(autenticar);

const receitaSchema = z.object({
  imovelId: z.string().min(1),
  inquilinoId: z.string().min(1).optional(),
  dataRecebimento: z.coerce.date(),
  descricao: z.string().min(1),
  valor: z.coerce.number().positive(),
  formaPagamento: z.enum(['PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO']),
  status: z.enum(['PAGO', 'ATRASADO', 'PENDENTE']).optional(),
});

// GET /receitas?imovelId=...&status=...&de=...&ate=...
receitasRouter.get('/', async (req, res, next) => {
  try {
    const imovelId = z.string().min(1).parse(req.query.imovelId);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);

    const filtros = z
      .object({
        status: z.enum(['PAGO', 'ATRASADO', 'PENDENTE']).optional(),
        de: z.coerce.date().optional(),
        ate: z.coerce.date().optional(),
      })
      .parse(req.query);

    const receitas = await prisma.receita.findMany({
      where: {
        imovelId,
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.de || filtros.ate
          ? { dataRecebimento: { ...(filtros.de ? { gte: filtros.de } : {}), ...(filtros.ate ? { lte: filtros.ate } : {}) } }
          : {}),
      },
      include: { inquilino: { select: { id: true, nome: true } } },
      orderBy: { dataRecebimento: 'desc' },
    });
    res.json(receitas);
  } catch (err) {
    next(err);
  }
});

receitasRouter.post('/', async (req, res, next) => {
  try {
    const dados = receitaSchema.parse(req.body);
    await garantirAcessoImovel(req.usuario!.sub, dados.imovelId);
    if (dados.inquilinoId) {
      const inq = await prisma.inquilino.findUnique({ where: { id: dados.inquilinoId } });
      if (!inq || inq.imovelId !== dados.imovelId) {
        return res.status(400).json({ mensagem: 'Inquilino inválido para este imóvel' });
      }
    }
    const receita = await prisma.receita.create({ data: dados });
    emitirParaImovel(receita.imovelId, 'receita:criada', receita);
    res.status(201).json(receita);
  } catch (err) {
    next(err);
  }
});

receitasRouter.put('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.receita.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Receita não encontrada' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    const dados = receitaSchema.omit({ imovelId: true }).partial().parse(req.body);
    const receita = await prisma.receita.update({ where: { id: req.params.id }, data: dados });
    emitirParaImovel(receita.imovelId, 'receita:atualizada', receita);
    res.json(receita);
  } catch (err) {
    next(err);
  }
});

receitasRouter.delete('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.receita.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Receita não encontrada' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    await prisma.receita.delete({ where: { id: req.params.id } });
    emitirParaImovel(existente.imovelId, 'receita:removida', { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
