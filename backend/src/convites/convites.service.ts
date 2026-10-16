import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../auth/auth.service.js';

// Prazos que quem convida pode escolher (minutos).
export const PRAZOS_CONVITE = [30, 120, 1440] as const;
export type PrazoConvite = (typeof PRAZOS_CONVITE)[number];

// Só o hash vai para o banco: quem lê o banco não consegue usar um convite em aberto.
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

// Gera um convite de uso único. Sem criador = gerado pelo terminal (primeira conta).
export async function criarConvite(minutos: PrazoConvite, criadoPorId?: string) {
  const token = randomBytes(24).toString('base64url');
  const expiraEm = new Date(Date.now() + minutos * 60_000);
  await prisma.convite.create({ data: { tokenHash: hash(token), criadoPorId, expiraEm } });
  return { token, expiraEm };
}

// Diz se o convite ainda serve (existe, não foi usado e está no prazo), sem gastá-lo.
export async function conviteValido(token: string) {
  const c = await prisma.convite.findUnique({ where: { tokenHash: hash(token) } });
  return !!c && !c.usadoEm && c.expiraEm > new Date();
}

// Gasta o convite dentro da transação do cadastro. A condição no UPDATE garante uso único
// mesmo com dois cadastros simultâneos; se o cadastro falhar, a transação desfaz o uso.
export async function usarConvite(tx: Prisma.TransactionClient, token: string) {
  const { count } = await tx.convite.updateMany({
    where: { tokenHash: hash(token), usadoEm: null, expiraEm: { gt: new Date() } },
    data: { usadoEm: new Date() },
  });
  if (count === 0) throw new AppError(403, 'Convite inválido, vencido ou já usado');
}
