import { createServer } from 'node:http';
import { env } from './env.js';
import { criarApp } from './app.js';
import { iniciarRealtime } from './realtime.js';

const app = criarApp();
const httpServer = createServer(app);

iniciarRealtime(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${env.PORT}`);
});
