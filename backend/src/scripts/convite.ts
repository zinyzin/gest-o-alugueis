// Gera um link de convite pelo terminal (ex.: a primeira conta, quando ainda não há ninguém).
//   npx tsx src/scripts/convite.ts [minutos]          (dev)
//   node dist/scripts/convite.js [minutos]            (produção; bin/prod convite)
// Imprime só o token; quem chama monta o link /convite?token=...
import { prisma } from '../prisma.js';
import { criarConvite, PRAZOS_CONVITE, type PrazoConvite } from '../convites/convites.service.js';

const minutos = Number(process.argv[2] ?? 120);
if (!(PRAZOS_CONVITE as readonly number[]).includes(minutos)) {
  console.error(`prazo inválido: use ${PRAZOS_CONVITE.join(', ')} (minutos)`);
  process.exit(2);
}

const { token } = await criarConvite(minutos as PrazoConvite);
console.log(token);
await prisma.$disconnect();
