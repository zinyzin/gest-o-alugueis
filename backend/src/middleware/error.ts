import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../auth/auth.service.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tratarErros(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ mensagem: 'Dados inválidos', erros: err.flatten().fieldErrors });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ mensagem: err.message });
  }
  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor' });
}
