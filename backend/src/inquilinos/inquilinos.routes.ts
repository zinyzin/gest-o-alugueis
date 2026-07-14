import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';
import { emitirParaImovel } from '../realtime.js';

export const inquilinosRouter = Router();
inquilinosRouter.use(autenticar);

const inquilinoSchema = z.object({
  imovelId: z.string().min(1),
  nome: z.string().min(1),
  cpfCnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
});

// Lista inquilinos de um imóvel: GET /inquilinos?imovelId=...
inquilinosRouter.get('/', async (req, res, next) => {
  try {
    const imovelId = z.string().min(1).parse(req.query.imovelId);
    await garantirAcessoImovel(req.usuario!.sub, imovelId);
    const inquilinos = await prisma.inquilino.findMany({ where: { imovelId }, orderBy: { nome: 'asc' } });
    res.json(inquilinos);
  } catch (err) {
    next(err);
  }
});

inquilinosRouter.post('/', async (req, res, next) => {
  try {
    const dados = inquilinoSchema.parse(req.body);
    await garantirAcessoImovel(req.usuario!.sub, dados.imovelId);
    const inquilino = await prisma.inquilino.create({ data: dados });
    emitirParaImovel(inquilino.imovelId, 'inquilino:criado', inquilino);
    res.status(201).json(inquilino);
  } catch (err) {
    next(err);
  }
});

inquilinosRouter.put('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.inquilino.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Inquilino não encontrado' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    const dados = inquilinoSchema.omit({ imovelId: true }).partial().parse(req.body);
    const inquilino = await prisma.inquilino.update({ where: { id: req.params.id }, data: dados });
    emitirParaImovel(inquilino.imovelId, 'inquilino:atualizado', inquilino);
    res.json(inquilino);
  } catch (err) {
    next(err);
  }
});

inquilinosRouter.delete('/:id', async (req, res, next) => {
  try {
    const existente = await prisma.inquilino.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ mensagem: 'Inquilino não encontrado' });
    await garantirAcessoImovel(req.usuario!.sub, existente.imovelId);
    await prisma.inquilino.delete({ where: { id: req.params.id } });
    emitirParaImovel(existente.imovelId, 'inquilino:removido', { id: req.params.id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
