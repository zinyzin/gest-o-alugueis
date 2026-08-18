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

  const res = await fetch(`/api${path}`, {
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

// Upload de arquivo (multipart) — retorna a URL pública do comprovante/anexo.
async function uploadArquivo(arquivo: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('arquivo', arquivo);
  const token = getToken();
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data?.mensagem ?? 'Falha no upload');
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload: uploadArquivo,
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

export type FormaPagamento = 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'DINHEIRO' | 'CARTAO';
export type StatusReceita = 'PAGO' | 'ATRASADO' | 'PENDENTE';
export type CategoriaDespesa = 'AGUA' | 'LUZ' | 'IPTU' | 'CONDOMINIO' | 'MANUTENCAO' | 'REFORMA' | 'IMPOSTOS' | 'OUTRO';

export const FORMAS_PAGAMENTO: FormaPagamento[] = ['PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO'];
export const STATUS_RECEITA: StatusReceita[] = ['PAGO', 'ATRASADO', 'PENDENTE'];
export const CATEGORIAS_DESPESA: CategoriaDespesa[] = ['AGUA', 'LUZ', 'IPTU', 'CONDOMINIO', 'MANUTENCAO', 'REFORMA', 'IMPOSTOS', 'OUTRO'];

export type IndiceReajuste = 'IGPM' | 'IPCA' | 'INPC' | 'OUTRO';
export const INDICES_REAJUSTE: IndiceReajuste[] = ['IGPM', 'IPCA', 'INPC', 'OUTRO'];

export interface Inquilino {
  id: string;
  nome: string;
  cpfCnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface Contrato {
  id: string;
  inquilinoId: string;
  dataInicio: string;
  dataFim?: string | null;
  valorAluguel: string;
  diaVencimento: number;
  indiceReajuste: IndiceReajuste;
  valorCaucao?: string | null;
  anexoUrl?: string | null;
  inquilino?: { id: string; nome: string } | null;
}

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
