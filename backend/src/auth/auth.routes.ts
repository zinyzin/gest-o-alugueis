import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { registrar, login } from './auth.service.js';
import { autenticar } from '../middleware/auth.js';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { usarConvite } from '../convites/convites.service.js';

export const authRouter = Router();

const QUINZE_MIN = 15 * 60 * 1000;
const muitas = { mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' };

// Só tentativas erradas contam: quem acerta a senha não é bloqueado.
const limiteLoginPorIp = rateLimit({
  windowMs: QUINZE_MIN,
  limit: () => env.LIMITE_LOGIN,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: muitas,
});
// Por e-mail: protege a conta mesmo com tentativas vindas de muitos endereços.
const limiteLoginPorEmail = rateLimit({
  windowMs: QUINZE_MIN,
  limit: () => env.LIMITE_LOGIN,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `email:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: muitas,
});
const limiteCadastro = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: () => env.LIMITE_CADASTRO,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: muitas,
});

// Criar conta só com convite (link gerado por quem já tem conta). Senha sem tamanho mínimo,
// a pedido: o sistema é de uso familiar e o acesso já depende do convite.
const registroSchema = z.object({
  nome: z.string().trim().min(1),
  email: z.string().email(),
  senha: z.string().min(1),
  convite: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post('/registrar', limiteCadastro, async (req, res, next) => {
  try {
    // O perfil não é escolhido no cadastro: toda conta nova nasce com o perfil padrão.
    const { nome, email, senha, convite } = registroSchema.parse(req.body);
    const usuario = await prisma.$transaction(async (tx) => {
      await usarConvite(tx, convite);
      return registrar(nome, email, senha, undefined, tx);
    });
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', limiteLoginPorIp, limiteLoginPorEmail, async (req, res, next) => {
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
