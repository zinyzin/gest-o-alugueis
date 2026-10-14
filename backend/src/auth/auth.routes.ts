import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { registrar, login, AppError } from './auth.service.js';
import { autenticar } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { env } from '../env.js';

export const authRouter = Router();

const registroSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  codigoConvite: z.string().optional(),
});

function conviteValido(informado: string | undefined): boolean {
  if (!env.CODIGO_CONVITE) return true;
  const a = Buffer.from(informado ?? '');
  const b = Buffer.from(env.CODIGO_CONVITE);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Diz à tela se o cadastro pede código de convite.
authRouter.get('/config', (_req, res) => {
  res.json({ conviteObrigatorio: !!env.CODIGO_CONVITE });
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post('/registrar', async (req, res, next) => {
  try {
    // O perfil não é escolhido no cadastro: toda conta nova nasce com o perfil padrão.
    const { nome, email, senha, codigoConvite } = registroSchema.parse(req.body);
    if (!conviteValido(codigoConvite)) throw new AppError(403, 'Código de convite inválido');
    const usuario = await registrar(nome, email, senha);
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
