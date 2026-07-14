import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../auth/auth.service.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function tratarErros(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ mensagem: 'Dados inválidos', erros: err.flatten().fieldErrors });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ mensagem: err.message });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ mensagem: `Falha no upload: ${err.message}` });
  }
  // Erro do fileFilter (tipo não permitido) chega como Error comum.
  if (err instanceof Error && err.message.startsWith('Tipo de arquivo')) {
    return res.status(400).json({ mensagem: err.message });
  }
  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor' });
}
