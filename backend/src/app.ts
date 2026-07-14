import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { authRouter } from './auth/auth.routes.js';
import { imoveisRouter } from './imoveis/imoveis.routes.js';
import { inquilinosRouter } from './inquilinos/inquilinos.routes.js';
import { contratosRouter } from './contratos/contratos.routes.js';
import { tratarErros } from './middleware/error.js';

export function criarApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', hora: new Date().toISOString() }));

  app.use('/auth', authRouter);
  app.use('/imoveis', imoveisRouter);
  app.use('/inquilinos', inquilinosRouter);
  app.use('/contratos', contratosRouter);
  // Fase 2: /receitas, /despesas

  app.use(tratarErros);

  return app;
}
