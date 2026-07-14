import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { env } from './env.js';
import { verificarToken } from './auth/auth.service.js';

let io: SocketServer | null = null;

// Cada imóvel é uma "sala": alterações são propagadas a todos os clientes conectados.
export function iniciarRealtime(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  // Autenticação do socket via token JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Token não fornecido'));
    try {
      socket.data.usuario = verificarToken(token);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('entrarImovel', (imovelId: string) => socket.join(`imovel:${imovelId}`));
    socket.on('sairImovel', (imovelId: string) => socket.leave(`imovel:${imovelId}`));
  });

  return io;
}

// Emite um evento de mudança para todos os clientes de um imóvel.
export function emitirParaImovel(imovelId: string, evento: string, dados: unknown) {
  io?.to(`imovel:${imovelId}`).emit(evento, dados);
}
