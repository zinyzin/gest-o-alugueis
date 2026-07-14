import { Router } from 'express';
import { z } from 'zod';
import { registrar, login } from './auth.service.js';
import { autenticar } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

export const authRouter = Router();

const registroSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  perfil: z.enum(['ADMIN', 'VISUALIZADOR']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post('/registrar', async (req, res, next) => {
  try {
    const { nome, email, senha, perfil } = registroSchema.parse(req.body);
    const usuario = await registrar(nome, email, senha, perfil);
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = loginSchema.parse(req.body);
    const resultado = await login(email, senha);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/eu', autenticar, async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.sub },
      select: { id: true, nome: true, email: true, perfil: true, criadoEm: true },
    });
    res.json(usuario);
  } catch (err) {
    next(err);
  }
});
