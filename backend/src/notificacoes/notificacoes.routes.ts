import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { autenticar } from '../middleware/auth.js';
import { AppError } from '../auth/auth.service.js';

export const notificacoesRouter = Router();
notificacoesRouter.use(autenticar);

// Avisos dos imóveis a que a pessoa tem acesso, do mais novo ao mais antigo.
// GET /notificacoes?naoLidas=true&limite=30
notificacoesRouter.get('/', async (req, res, next) => {
  try {
    const usuarioId = req.usuario!.sub;
    const { naoLidas, limite } = z
      .object({ naoLidas: z.enum(['true', 'false']).optional(), limite: z.coerce.number().int().min(1).max(100).default(30) })
      .parse(req.query);
    const where = {
      imovel: { usuarios: { some: { usuarioId } } },
      ...(naoLidas === 'true' ? { leituras: { none: { usuarioId } } } : {}),
    };
    const [itens, totalNaoLidas] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        include: { imovel: { select: { id: true, endereco: true } }, leituras: { where: { usuarioId }, select: { lidaEm: true } } },
        orderBy: { criadoEm: 'desc' },
        take: limite,
      }),
      prisma.notificacao.count({ where: { imovel: { usuarios: { some: { usuarioId } } }, leituras: { none: { usuarioId } } } }),
    ]);
    res.json({
      totalNaoLidas,
      itens: itens.map(({ leituras, ...n }) => ({ ...n, lida: leituras.length > 0 })),
    });
  } catch (err) {
    next(err);
  }
});

// Marca um aviso como lido (só para a própria pessoa).
notificacoesRouter.post('/:id/lida', async (req, res, next) => {
  try {
    const usuarioId = req.usuario!.sub;
    const n = await prisma.notificacao.findFirst({
      where: { id: req.params.id, imovel: { usuarios: { some: { usuarioId } } } },
    });
    // Aviso de imóvel sem acesso responde como inexistente.
    if (!n) throw new AppError(404, 'Aviso não encontrado');
    await prisma.notificacaoLeitura.upsert({
      where: { usuarioId_notificacaoId: { usuarioId, notificacaoId: n.id } },
      create: { usuarioId, notificacaoId: n.id },
      update: {},
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Marca todos os avisos visíveis como lidos.
notificacoesRouter.post('/lidas', async (req, res, next) => {
  try {
    const usuarioId = req.usuario!.sub;
    const pendentes = await prisma.notificacao.findMany({
      where: { imovel: { usuarios: { some: { usuarioId } } }, leituras: { none: { usuarioId } } },
      select: { id: true },
    });
    await prisma.notificacaoLeitura.createMany({
      data: pendentes.map((n) => ({ usuarioId, notificacaoId: n.id })),
      skipDuplicates: true,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
