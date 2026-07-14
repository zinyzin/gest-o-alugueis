import type { Request, Response, NextFunction } from 'express';
import type { Perfil } from '@prisma/client';
import { verificarToken, type TokenPayload } from '../auth/auth.service.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: TokenPayload;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Token não fornecido' });
  }

  try {
    req.usuario = verificarToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ mensagem: 'Token inválido ou expirado' });
  }
}

// Autorização por perfil (ex.: apenas ADMIN escreve)
export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    next();
  };
}
