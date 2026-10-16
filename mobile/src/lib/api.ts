import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Endereço do sistema (o mesmo do web). No celular, use o link público ou o IP do PC na rede:
//   EXPO_PUBLIC_API_URL=https://xxxx.trycloudflare.com npx expo start
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');

// O token fica guardado no SecureStore (no navegador, no localStorage) e em memória.
const TOKEN_KEY = 'gia_token';
let token: string | null = null;

export const getToken = () => token;

export async function carregarToken() {
  token = Platform.OS === 'web' ? localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  return token;
}

export async function setToken(t: string) {
  token = t;
  if (Platform.OS === 'web') localStorage.setItem(TOKEN_KEY, t);
  else await SecureStore.setItemAsync(TOKEN_KEY, t);
}

export async function clearToken() {
  token = null;
  if (Platform.OS === 'web') localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${path}`, {
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

// Tipos do domínio (espelham o backend; mesmos do web/src/api.ts).
export interface Usuario { id: string; nome: string; email: string; perfil: 'ADMIN' | 'VISUALIZADOR'; }
export interface Imovel { id: string; endereco: string; descricao?: string | null; fotos: string[]; }
export interface Resumo {
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  receitasPorStatus: { status: string; total: number; qtd: number }[];
  despesasPorCategoria: { categoria: string; total: number; qtd: number }[];
}

export type StatusReceita = 'PAGO' | 'ATRASADO' | 'PENDENTE';
export type CategoriaDespesa = 'AGUA' | 'LUZ' | 'IPTU' | 'CONDOMINIO' | 'MANUTENCAO' | 'REFORMA' | 'IMPOSTOS' | 'OUTRO';

export const NOME_CATEGORIA: Record<CategoriaDespesa, string> = {
  AGUA: 'Água', LUZ: 'Luz', IPTU: 'IPTU', CONDOMINIO: 'Condomínio', MANUTENCAO: 'Manutenção',
  REFORMA: 'Reforma', IMPOSTOS: 'Impostos', OUTRO: 'Outro',
};
export const NOME_STATUS: Record<StatusReceita, string> = { PAGO: 'Pago', ATRASADO: 'Atrasado', PENDENTE: 'Pendente' };

export const brl = (v: number | string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
