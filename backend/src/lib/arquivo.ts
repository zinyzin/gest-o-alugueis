import { z } from 'zod';

const CAMINHO = /^\/arquivos\/[\w-]+\.(jpg|jpeg|png|webp|pdf)$/;

// Endereço de arquivo enviado: relativo (/arquivos/<nome>) ou URL http(s) completa apontando
// para /arquivos/ (registros antigos). Nada de javascript:, data: ou caminhos com "..".
function valido(v: string): boolean {
  if (CAMINHO.test(v)) return true;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && CAMINHO.test(u.pathname);
  } catch {
    return false;
  }
}

export const urlArquivo = z.string().refine(valido, 'Endereço de arquivo inválido');
