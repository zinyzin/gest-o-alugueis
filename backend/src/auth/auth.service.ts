import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Perfil } from '@prisma/client';
import { prisma } from '../prisma.js';
import { env } from '../env.js';

export interface TokenPayload {
  sub: string;
  perfil: Perfil;
}

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function registrar(nome: string, email: string, senha: string, perfil?: Perfil) {
  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw new AppError(409, 'E-mail já cadastrado');

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash, ...(perfil ? { perfil } : {}) },
  });

  return sanitizar(usuario);
}

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) throw new AppError(401, 'Credenciais inválidas');

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) throw new AppError(401, 'Credenciais inválidas');

  const token = gerarToken({ sub: usuario.id, perfil: usuario.perfil });
  return { token, usuario: sanitizar(usuario) };
}

function gerarToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verificarToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }
}

function sanitizar<T extends { senhaHash: string }>(usuario: T) {
  const { senhaHash, ...resto } = usuario;
  return resto;
}
