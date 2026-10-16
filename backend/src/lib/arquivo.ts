import { z } from 'zod';

// Endereço de arquivo enviado: só o caminho interno /arquivos/<uuid>.<ext>. Nada de URL de
// outro site (phishing pelo link "abrir"), javascript:, data: ou caminhos com "..".
export const urlArquivo = z
  .string()
  .regex(/^\/arquivos\/[\w-]+\.(jpg|jpeg|png|webp|pdf)$/, 'Endereço de arquivo inválido');
