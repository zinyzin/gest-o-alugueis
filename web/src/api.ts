// Cliente de API fino. O token é lido do localStorage a cada chamada.
const TOKEN_KEY = 'gia_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && typeof data === 'object' && 'mensagem' in data ? (data as any).mensagem : null) ?? 'Erro na requisição';
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

// Tipos do domínio (espelham o backend).
export interface Usuario { id: string; nome: string; email: string; perfil: 'ADMIN' | 'VISUALIZADOR'; }
export interface Imovel { id: string; endereco: string; descricao?: string | null; fotos: string[]; }
export interface Resumo {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  receitasPorStatus: { status: string; total: number; qtd: number }[];
  despesasPorCategoria: { categoria: string; total: number; qtd: number }[];
}
