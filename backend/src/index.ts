import { createServer } from 'node:http';
import { env } from './env.js';
import { criarApp } from './app.js';
import { iniciarRealtime } from './realtime.js';
import { iniciarAgendador } from './rotinas/agendador.js';

const app = criarApp();
const httpServer = createServer(app);

iniciarRealtime(httpServer);
if (env.ROTINAS_ATIVAS === 'true') iniciarAgendador();

httpServer.listen(env.PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${env.PORT}`);
});
