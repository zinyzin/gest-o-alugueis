import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

// Em dev o backend roda em :3333; em produção usamos a mesma origem.
const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3333' : undefined;

let socket: Socket | null = null;

function obterSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token: getToken() },
      autoConnect: true,
    });
  }
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

// Entra na "sala" do imóvel e chama onChange a cada evento de mudança.
// O nome do evento é repassado para quem quiser filtrar.
export function useImovelRealtime(imovelId: string | undefined, onChange: (evento: string) => void) {
  useEffect(() => {
    if (!imovelId) return;
    const s = obterSocket();

    const entrar = () => s.emit('entrarImovel', imovelId);
    entrar();
    s.on('connect', entrar);

    const handler = (evento: string) => {
      // Ignora eventos internos do socket.io (connect, disconnect, etc.).
      if (evento.includes(':')) onChange(evento);
    };
    s.onAny(handler);

    return () => {
      s.emit('sairImovel', imovelId);
      s.off('connect', entrar);
      s.offAny(handler);
    };
  }, [imovelId, onChange]);
}
