import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { garantirAcessoImovel } from '../lib/acesso.js';
import { emitirParaImovel } from '../realtime.js';

export const imoveisRouter = Router();
imoveisRouter.use(autenticar);

const imovelSchema = z.object({
  endereco: z.string().min(1),
  descricao: z.string().optional(),
  fotos: z.array(z.string().url()).optional(),
});

// Lista apenas os imóveis aos quais o usuário tem acesso.
imoveisRouter.get('/', async (req, res, next) => {
  try {
    const imoveis = await prisma.imovel.findMany({
      where: { usuarios: { some: { usuarioId: req.usuario!.sub } } },
      orderBy: { criadoEm: 'desc' },
    });
    res.json(imoveis);
  } catch (err) {
    next(err);
  }
});

// Cria o imóvel e vincula o criador (acesso multiusuário começa por ele).
imoveisRouter.post('/', async (req, res, next) => {
  try {
    const dados = imovelSchema.parse(req.body);
    const imovel = await prisma.imovel.create({
      data: {
        ...dados,
        fotos: dados.fotos ?? [],
        usuarios: { create: { usuarioId: req.usuario!.sub } },
      },
    });
    res.status(201).json(imovel);
  } catch (err) {
    next(err);
  }
});

imoveisRouter.get('/:id', async (req, res, next) => {
  try {
    await garantirAcessoImovel(req.usuario!.sub, req.params.id);
    const imovel = await prisma.imovel.findUnique({ where: { id: req.params.id } });
    res.json(imovel);
  } catch (err) {
    next(err);
  }
});

imoveisRouter.put('/:id', async (req, res, next) => {
  try {
    await garantirAcessoImovel(req.usuario!.sub, req.params.id);
    const dados = imovelSchema.partial().parse(req.body);
    const imovel = await prisma.imovel.update({ where: { id: req.params.id }, data: dados });
    emitirParaImovel(imovel.id, 'imovel:atualizado', imovel);
    res.json(imovel);
  } catch (err) {
    next(err);
  }
});

imoveisRouter.delete('/:id', async (req, res, next) => {
  try {
    await garantirAcessoImovel(req.usuario!.sub, req.params.id);
    await prisma.imovel.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Compartilha o imóvel com outro usuário (por e-mail).
const compartilharSchema = z.object({ email: z.string().email() });
imoveisRouter.post('/:id/compartilhar', async (req, res, next) => {
  try {
    await garantirAcessoImovel(req.usuario!.sub, req.params.id);
    const { email } = compartilharSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    await prisma.usuarioImovel.upsert({
      where: { usuarioId_imovelId: { usuarioId: usuario.id, imovelId: req.params.id } },
      create: { usuarioId: usuario.id, imovelId: req.params.id },
      update: {},
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
