import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

  // Arquivos enviados (comprovantes, contratos) — servidos estaticamente.
  app.use('/arquivos', express.static(UPLOAD_DIR));

  // API sob /api para não colidir com as rotas do SPA (ex.: /imoveis/:id no web).
  app.use('/api/auth', authRouter);
  app.use('/api/imoveis', imoveisRouter);
  app.use('/api/inquilinos', inquilinosRouter);
  app.use('/api/contratos', contratosRouter);
  app.use('/api/receitas', receitasRouter);
  app.use('/api/despesas', despesasRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/relatorios', relatoriosRouter);

  // Em produção, serve o web buildado (mesma origem → sem CORS, socket direto).
  // A pasta `public` é preenchida com web/dist no build da imagem Docker.
  const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
    // Fallback SPA: rotas do react-router caem no index.html.
    // Rotas de API/arquivos desconhecidas devem retornar 404, não o HTML.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/arquivos/')) return next();
      res.sendFile(fileURLToPath(new URL('../public/index.html', import.meta.url)));
    });
  }

  app.use(tratarErros);

  return app;
}
