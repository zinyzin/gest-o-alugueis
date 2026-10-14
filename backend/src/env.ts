import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('*'),
  // Se definido, criar conta exige este código (útil com o sistema exposto na internet).
  CODIGO_CONVITE: z.string().min(6).optional(),
  // Fuso usado para saber que dia é "hoje" nas rotinas (vencimentos, atrasos, avisos).
  FUSO_HORARIO: z.string().default('America/Sao_Paulo'),
  // Permite desligar as rotinas automáticas (ex.: numa segunda instância da API).
  ROTINAS_ATIVAS: z.enum(['true', 'false']).default('true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
