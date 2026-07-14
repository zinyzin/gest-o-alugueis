import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, clearToken, type Usuario } from './api';
import { desconectarSocket } from './realtime';

interface AuthCtx {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão se houver token salvo.
  useEffect(() => {
    if (!getToken()) {
      setCarregando(false);
      return;
    }
    api
      .get<Usuario>('/auth/eu')
      .then(setUsuario)
      .catch(() => clearToken())
      .finally(() => setCarregando(false));
  }, []);

  async function login(email: string, senha: string) {
    const { token, usuario } = await api.post<{ token: string; usuario: Usuario }>('/auth/login', { email, senha });
    setToken(token);
    setUsuario(usuario);
  }

  function sair() {
    desconectarSocket();
    clearToken();
    setUsuario(null);
  }

  return <Ctx.Provider value={{ usuario, carregando, login, sair }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
