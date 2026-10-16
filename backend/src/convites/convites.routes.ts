import { Router } from 'express';
import { z } from 'zod';
import { autenticar } from '../middleware/auth.js';
import { criarConvite, conviteValido, PRAZOS_CONVITE, type PrazoConvite } from './convites.service.js';

export const convitesRouter = Router();

// POST /convites { minutos: 30 | 120 | 1440 } — só quem já tem conta convida.
const criarSchema = z.object({
  minutos: z.coerce
    .number()
    .refine((m): m is PrazoConvite => (PRAZOS_CONVITE as readonly number[]).includes(m), 'Prazo inválido')
    .default(120),
});

convitesRouter.post('/', autenticar, async (req, res, next) => {
  try {
    const { minutos } = criarSchema.parse(req.body ?? {});
    const convite = await criarConvite(minutos as PrazoConvite, req.usuario!.sub);
    res.status(201).json(convite);
  } catch (err) {
    next(err);
  }
});

// GET /convites/:token — a tela de cadastro confere o link antes de mostrar o formulário.
convitesRouter.get('/:token', async (req, res, next) => {
  try {
    res.json({ valido: await conviteValido(req.params.token) });
  } catch (err) {
    next(err);
  }
});
