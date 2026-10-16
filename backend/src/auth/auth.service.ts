import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Perfil, Prisma } from '@prisma/client';
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

export async function registrar(
  nome: string,
  email: string,
  senha: string,
  perfil?: Perfil,
  db: Prisma.TransactionClient = prisma,
) {
  const existe = await db.usuario.findUnique({ where: { email } });
  if (existe) throw new AppError(409, 'E-mail já cadastrado');

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await db.usuario.create({
    data: { nome, email, senhaHash, ...(perfil ? { perfil } : {}) },
  });

  return sanitizar(usuario);
}

// Hash de uma senha qualquer: e-mail inexistente também passa pelo bcrypt, para o tempo de
// resposta não revelar quais e-mails têm conta.
const HASH_FICTICIO = bcrypt.hashSync('senha-que-nao-existe', 10);

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const ok = await bcrypt.compare(senha, usuario?.senhaHash ?? HASH_FICTICIO);
  if (!usuario || !ok) throw new AppError(401, 'Credenciais inválidas');

  const token = gerarToken({ sub: usuario.id, perfil: usuario.perfil });
  return { token, usuario: sanitizar(usuario) };
}

function gerarToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verificarToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }
}

function sanitizar<T extends { senhaHash: string }>(usuario: T) {
  const { senhaHash, ...resto } = usuario;
  return resto;
}
