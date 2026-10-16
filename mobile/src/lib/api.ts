import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Endereço do sistema (o mesmo do web). Padrão vindo do build e trocável na tela de login,
// porque o link público do cloudflared muda a cada "bin/prod on".
//   EXPO_PUBLIC_API_URL=https://xxxx.trycloudflare.com npx expo start
const API_PADRAO = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';
let apiUrl = API_PADRAO;
export const getApiUrl = () => apiUrl;
const normalizar = (u: string) => u.trim().replace(/\/+$/, '');

// Token (no SecureStore; no navegador, no localStorage) e endereço ficam guardados no aparelho.
const TOKEN_KEY = 'gia_token';
const URL_KEY = 'gia_api_url';
let token: string | null = null;

const ler = (k: string) => (Platform.OS === 'web' ? Promise.resolve(localStorage.getItem(k)) : SecureStore.getItemAsync(k));
const gravar = (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(localStorage.setItem(k, v)) : SecureStore.setItemAsync(k, v));
const apagar = (k: string) => (Platform.OS === 'web' ? Promise.resolve(localStorage.removeItem(k)) : SecureStore.deleteItemAsync(k));

export const getToken = () => token;

export async function carregarToken() {
  apiUrl = (await ler(URL_KEY)) ?? API_PADRAO;
  token = await ler(TOKEN_KEY);
  return token;
}

export async function setApiUrl(u: string) {
  apiUrl = normalizar(u) || API_PADRAO;
  await gravar(URL_KEY, apiUrl);
}

export async function setToken(t: string) {
  token = t;
  await gravar(TOKEN_KEY, t);
}

export async function clearToken() {
  token = null;
  await apagar(TOKEN_KEY);
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

  const res = await fetch(`${apiUrl}/api${path}`, {
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

// Upload de foto (multipart) — retorna o caminho interno do comprovante (/arquivos/...).
// No celular o FormData aceita {uri, name, type}; no navegador precisa do arquivo de verdade.
async function uploadFoto(uri: string, nome: string, tipo: string): Promise<{ url: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') form.append('arquivo', await (await fetch(uri)).blob(), nome);
  else form.append('arquivo', { uri, name: nome, type: tipo } as unknown as Blob);
  const res = await fetch(`${apiUrl}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok || !data) throw new ApiError(res.status, data?.mensagem ?? 'Falha no upload');
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  uploadFoto,
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

export interface Notificacao {
  id: string;
  imovelId: string;
  tipo: 'ALUGUEL_ATRASADO' | 'REAJUSTE' | 'CONTRATO_VENCENDO';
  titulo: string;
  mensagem: string;
  criadoEm: string;
  lida: boolean;
  imovel: { id: string; endereco: string };
}

export type FormaPagamento = 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'DINHEIRO' | 'CARTAO';
export type StatusReceita = 'PAGO' | 'ATRASADO' | 'PENDENTE';
export type CategoriaDespesa = 'AGUA' | 'LUZ' | 'IPTU' | 'CONDOMINIO' | 'MANUTENCAO' | 'REFORMA' | 'IMPOSTOS' | 'OUTRO';

export const FORMAS_PAGAMENTO: FormaPagamento[] = ['PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO'];
export const STATUS_RECEITA: StatusReceita[] = ['PAGO', 'ATRASADO', 'PENDENTE'];
export const CATEGORIAS_DESPESA: CategoriaDespesa[] = ['AGUA', 'LUZ', 'IPTU', 'CONDOMINIO', 'MANUTENCAO', 'REFORMA', 'IMPOSTOS', 'OUTRO'];
export const NOME_FORMA: Record<FormaPagamento, string> = {
  PIX: 'Pix', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência', DINHEIRO: 'Dinheiro', CARTAO: 'Cartão',
};

export interface Receita {
  id: string;
  dataRecebimento: string;
  descricao: string;
  valor: string;
  formaPagamento: FormaPagamento;
  status: StatusReceita;
  inquilino?: { id: string; nome: string } | null;
}

export interface Despesa {
  id: string;
  dataPagamento: string;
  categoria: CategoriaDespesa;
  descricao: string;
  fornecedor?: string | null;
  valor: string;
  formaPagamento: FormaPagamento;
  comprovanteUrl?: string | null;
}

export const NOME_CATEGORIA: Record<CategoriaDespesa, string> = {
  AGUA: 'Água', LUZ: 'Luz', IPTU: 'IPTU', CONDOMINIO: 'Condomínio', MANUTENCAO: 'Manutenção',
  REFORMA: 'Reforma', IMPOSTOS: 'Impostos', OUTRO: 'Outro',
};
export const NOME_STATUS: Record<StatusReceita, string> = { PAGO: 'Pago', ATRASADO: 'Atrasado', PENDENTE: 'Pendente' };

export const brl = (v: number | string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Datas do backend vêm em UTC à meia-noite: mostra o dia sem converter fuso.
export const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
