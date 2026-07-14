import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { authRouter } from './auth/auth.routes.js';
import { imoveisRouter } from './imoveis/imoveis.routes.js';
import { inquilinosRouter } from './inquilinos/inquilinos.routes.js';
import { contratosRouter } from './contratos/contratos.routes.js';
import { receitasRouter } from './receitas/receitas.routes.js';
import { despesasRouter } from './despesas/despesas.routes.js';
import { uploadsRouter, UPLOAD_DIR } from './uploads/uploads.routes.js';
import { dashboardRouter } from './dashboard/dashboard.routes.js';
import { relatoriosRouter } from './relatorios/relatorios.routes.js';
import { tratarErros } from './middleware/error.js';

export function criarApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', hora: new Date().toISOString() }));

  // Arquivos enviados (comprovantes, contratos) — servidos estaticamente em dev.
  app.use('/arquivos', express.static(UPLOAD_DIR));

  app.use('/auth', authRouter);
  app.use('/imoveis', imoveisRouter);
  app.use('/inquilinos', inquilinosRouter);
  app.use('/contratos', contratosRouter);
  app.use('/receitas', receitasRouter);
  app.use('/despesas', despesasRouter);
  app.use('/uploads', uploadsRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/relatorios', relatoriosRouter);

  app.use(tratarErros);

  return app;
}
