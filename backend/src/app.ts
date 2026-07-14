import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { authRouter } from './auth/auth.routes.js';
import { tratarErros } from './middleware/error.js';

export function criarApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', hora: new Date().toISOString() }));

  app.use('/auth', authRouter);
  // Fase 1+: app.use('/imoveis', imoveisRouter), /inquilinos, /contratos, /receitas, /despesas

  app.use(tratarErros);

  return app;
}
