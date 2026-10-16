import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { env } from './env.js';
import { verificarToken, type TokenPayload } from './auth/auth.service.js';
import { garantirAcessoImovel } from './lib/acesso.js';
import { prisma } from './prisma.js';

let io: SocketServer | null = null;

// Cada imóvel é uma "sala": alterações são propagadas a todos os clientes conectados.
// Cada pessoa também tem a própria sala, usada pelos avisos (sininho).
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
    const usuario = socket.data.usuario as TokenPayload;
    socket.join(`usuario:${usuario.sub}`);
    // Só entra na sala de um imóvel quem tem acesso a ele.
    socket.on('entrarImovel', async (imovelId: unknown) => {
      if (typeof imovelId !== 'string') return;
      try {
        await garantirAcessoImovel(usuario.sub, imovelId);
        socket.join(`imovel:${imovelId}`);
      } catch {
        socket.emit('erro', { mensagem: 'Sem acesso a este imóvel' });
      }
    });
    socket.on('sairImovel', (imovelId: unknown) => {
      if (typeof imovelId === 'string') socket.leave(`imovel:${imovelId}`);
    });
  });

  return io;
}

// Emite um evento de mudança para todos os clientes de um imóvel.
export function emitirParaImovel(imovelId: string, evento: string, dados: unknown) {
  io?.to(`imovel:${imovelId}`).emit(evento, dados);
}

// Tira da sala do imóvel quem perdeu o acesso (ou todos, se o imóvel foi excluído),
// para que deixem de receber os eventos ao vivo na hora.
export function expulsarDaSala(imovelId: string, usuarioId?: string) {
  if (!io) return;
  const alvo = usuarioId ? io.in(`usuario:${usuarioId}`) : io.in(`imovel:${imovelId}`);
  alvo.socketsLeave(`imovel:${imovelId}`);
}

// Emite para a sala pessoal de cada pessoa com acesso ao imóvel (estejam ou não nele).
export async function emitirParaPessoasDoImovel(imovelId: string, evento: string, dados: unknown) {
  if (!io) return;
  const vinculos = await prisma.usuarioImovel.findMany({ where: { imovelId }, select: { usuarioId: true } });
  for (const v of vinculos) io.to(`usuario:${v.usuarioId}`).emit(evento, dados);
}
