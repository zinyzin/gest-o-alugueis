import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { emitirParaImovel, emitirParaPessoasDoImovel } from '../realtime.js';
import { competencia, diaUtc, diasEntre, formatarData, somarMeses, ultimoDiaDoMes } from './datas.js';

const brl = (v: Prisma.Decimal | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Contratos em vigor no dia: já começaram e não terminaram.
const emVigor = (hoje: Date): Prisma.ContratoWhereInput => ({
  dataInicio: { lte: hoje },
  OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
});

// Cria o aviso só se ainda não existir (a chave identifica o fato avisado).
async function avisar(dados: Prisma.NotificacaoUncheckedCreateInput): Promise<boolean> {
  try {
    const n = await prisma.notificacao.create({ data: dados });
    await emitirParaPessoasDoImovel(n.imovelId, 'notificacao:criada', n);
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false;
    throw err;
  }
}

// C1: gera, como PENDENTE, o aluguel do mês de cada contrato em vigor.
export async function gerarAlugueisDoMes(hoje: Date): Promise<number> {
  const ano = hoje.getUTCFullYear();
  const mes0 = hoje.getUTCMonth();
  const comp = competencia(hoje);
  const contratos = await prisma.contrato.findMany({ where: emVigor(hoje) });
  let criadas = 0;
  for (const c of contratos) {
    const vencimento = diaUtc(ano, mes0, Math.min(c.diaVencimento, ultimoDiaDoMes(ano, mes0)));
    // O contrato pode ter começado depois do vencimento deste mês: aí o primeiro aluguel é o do mês seguinte.
    if (vencimento < c.dataInicio) continue;
    // Aluguel do mês já lançado à mão para este inquilino: não duplica.
    const manual = await prisma.receita.findFirst({
      where: {
        imovelId: c.imovelId,
        inquilinoId: c.inquilinoId,
        contratoId: null,
        dataRecebimento: { gte: diaUtc(ano, mes0, 1), lt: diaUtc(ano, mes0 + 1, 1) },
      },
    });
    if (manual) continue;
    try {
      const r = await prisma.receita.create({
        data: {
          imovelId: c.imovelId,
          inquilinoId: c.inquilinoId,
          contratoId: c.id,
          competencia: comp,
          dataRecebimento: vencimento,
          descricao: `Aluguel ${comp.slice(5)}/${comp.slice(0, 4)}`,
          valor: c.valorAluguel,
          formaPagamento: 'PIX',
          status: 'PENDENTE',
        },
      });
      emitirParaImovel(r.imovelId, 'receita:criada', r);
      criadas++;
    } catch (err) {
      // Já gerado para este contrato e mês.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
      throw err;
    }
  }
  return criadas;
}

// C2: receita pendente com vencimento já passado vira ATRASADO (e gera aviso).
export async function marcarAtrasos(hoje: Date): Promise<number> {
  const vencidas = await prisma.receita.findMany({ where: { status: 'PENDENTE', dataRecebimento: { lt: hoje } } });
  for (const r of vencidas) {
    // Status e aviso na mesma transação: um não acontece sem o outro.
    const aviso = await prisma.$transaction(async (tx) => {
      await tx.receita.update({ where: { id: r.id }, data: { status: 'ATRASADO' } });
      return tx.notificacao.upsert({
        where: { chave: `atraso:${r.id}` },
        update: {},
        create: {
          imovelId: r.imovelId,
          contratoId: r.contratoId,
          tipo: 'ALUGUEL_ATRASADO',
          titulo: 'Receita em atraso',
          mensagem: `"${r.descricao}" (${brl(r.valor)}) venceu em ${formatarData(r.dataRecebimento)} e não foi marcada como paga.`,
          chave: `atraso:${r.id}`,
        },
      });
    });
    emitirParaImovel(r.imovelId, 'receita:atualizada', { id: r.id, status: 'ATRASADO' });
    await emitirParaPessoasDoImovel(r.imovelId, 'notificacao:criada', aviso);
  }
  return vencidas.length;
}

// C3: avisa quando o contrato completa 12 meses desde o último reajuste (ou do início).
export async function avisarReajustes(hoje: Date): Promise<number> {
  const contratos = await prisma.contrato.findMany({ where: emVigor(hoje) });
  let avisos = 0;
  for (const c of contratos) {
    const base = c.dataUltimoReajuste ?? c.dataInicio;
    const proximo = somarMeses(base, 12);
    if (proximo > hoje) continue;
    const criado = await avisar({
      imovelId: c.imovelId,
      contratoId: c.id,
      tipo: 'REAJUSTE',
      titulo: 'Reajuste do aluguel',
      mensagem: `O contrato completou 12 meses em ${formatarData(proximo)}. Aplique o reajuste pelo ${c.indiceReajuste} sobre ${brl(c.valorAluguel)} na tela de cadastros.`,
      chave: `reajuste:${c.id}:${competencia(proximo)}`,
    });
    if (criado) avisos++;
  }
  return avisos;
}

// C4: avisa 60 e 30 dias antes do fim do contrato.
export async function avisarFimDeContrato(hoje: Date): Promise<number> {
  const contratos = await prisma.contrato.findMany({
    where: { dataFim: { gte: hoje, lte: somarMeses(hoje, 3) } },
    include: { inquilino: { select: { nome: true } } },
  });
  let avisos = 0;
  for (const c of contratos) {
    const faltam = diasEntre(hoje, c.dataFim!);
    const marco = faltam <= 30 ? 30 : faltam <= 60 ? 60 : null;
    if (!marco) continue;
    const criado = await avisar({
      imovelId: c.imovelId,
      contratoId: c.id,
      tipo: 'CONTRATO_VENCENDO',
      titulo: 'Contrato perto do fim',
      mensagem: `O contrato de ${c.inquilino.nome} termina em ${formatarData(c.dataFim!)} (faltam ${faltam} dias).`,
      chave: `fim:${c.id}:${competencia(c.dataFim!)}:${marco}`,
    });
    if (criado) avisos++;
  }
  return avisos;
}

export async function executarRotinas(hoje: Date) {
  const alugueis = await gerarAlugueisDoMes(hoje);
  const atrasos = await marcarAtrasos(hoje);
  const reajustes = await avisarReajustes(hoje);
  const fins = await avisarFimDeContrato(hoje);
  return { alugueis, atrasos, reajustes, fins };
}
