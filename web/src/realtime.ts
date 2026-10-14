import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

function obterSocket(): Socket {
  if (!socket) {
    // Mesma origem: em dev o proxy do Vite encaminha /socket.io para a API.
    socket = io({
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
      // Avisos chegam pela sala pessoal e são tratados pelo sininho.
      if (evento.includes(':') && !evento.startsWith('notificacao:')) onChange(evento);
    };
    s.onAny(handler);

    return () => {
      s.emit('sairImovel', imovelId);
      s.off('connect', entrar);
      s.offAny(handler);
    };
  }, [imovelId, onChange]);
}

// Escuta um evento da sala pessoal (ex.: novos avisos).
export function useEventoPessoal(evento: string, onEvento: () => void) {
  useEffect(() => {
    const s = obterSocket();
    s.on(evento, onEvento);
    return () => {
      s.off(evento, onEvento);
    };
  }, [evento, onEvento]);
}
