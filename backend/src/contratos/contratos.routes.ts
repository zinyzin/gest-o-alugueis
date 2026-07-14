import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';
import { emitirParaImovel } from '../realtime.js';

export const contratosRouter = Router();
contratosRouter.use(autenticar);

const contratoSchema = z.object({
  imovelId: z.string().min(1),
  inquilinoId: z.string().min(1),
  dataInicio: z.coerce.date(),
  dataFim: z.coerce.date().optional(),
  valorAluguel: z.coerce.number().positive(),
  diaVencimento: z.coerce.number().int().min(1).max(31),
  indiceReajuste: z.enum(['IGPM', 'IPCA', 'INPC', 'OUTRO']).optional(),
  dataUltimoReajuste: z.coerce.date().optional(),
  valorCaucao: z.coerce.number().nonnegative().optional(),
  anexoUrl: z.string().url().optional(),
});

contratosRouter.get('/', async (req, res, next) => {
  try {
    const imovelId = z.string().min(1).parse(req.query.imovelId);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);
    const contratos = await prisma.contrato.findMany({
      where: { imovelId },
      include: { inquilino: { select: { id: true, nome: true } } },
      orderBy: { dataInicio: 'desc' },
    });
    res.json(contratos);
  } catch (err) {
    next(err);
  }
});

contratosRouter.post('/', async (req, res, next) => {
  try {
    const dados = contratoSchema.parse(req.body);
    await garantirAcessoImovel(req.usuario!.sub, dados.imovelId);
    // O inquilino precisa pertencer ao mesmo imóvel.
    const inquilino = await prisma.inquilino.findUnique({ where: { id: dados.inquilinoId } });
    if (!inquilino || inquilino.imovelId !== dados.imovelId) {
      return res.status(400).json({ mensagem: 'Inquilino inválido para este imóvel' });
    }
    const contrato = await prisma.contrato.create({ data: dados });
    emitirParaImovel(contrato.imovelId, 'contrato:criado', contrato);
    res.status(201).json(contrato);
  } catch (err) {
    next(err);
  }
});

contratosRouter.put('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.contrato.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    const dados = contratoSchema.omit({ imovelId: true, inquilinoId: true }).partial().parse(req.body);
    const contrato = await prisma.contrato.update({ where: { id: req.params.id }, data: dados });
    emitirParaImovel(contrato.imovelId, 'contrato:atualizado', contrato);
    res.json(contrato);
  } catch (err) {
    next(err);
  }
});

contratosRouter.delete('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.contrato.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Contrato não encontrado' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    await prisma.contrato.delete({ where: { id: req.params.id } });
    emitirParaImovel(existente.imovelId, 'contrato:removido', { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
