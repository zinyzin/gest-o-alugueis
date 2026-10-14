// Datas "de calendário" (sem hora) são guardadas como meia-noite UTC, como as que chegam
// dos formulários ("2026-03-10"). "Hoje" é o dia no fuso da operação, não o do servidor.

export function hojeNoFuso(fuso: string, agora = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
  return new Date(`${partes}T00:00:00.000Z`);
}

export const diaUtc = (ano: number, mes0: number, dia: number) => new Date(Date.UTC(ano, mes0, dia));

export function ultimoDiaDoMes(ano: number, mes0: number): number {
  return new Date(Date.UTC(ano, mes0 + 1, 0)).getUTCDate();
}

// Soma meses mantendo o dia (limitado ao último dia do mês de destino).
export function somarMeses(data: Date, meses: number): Date {
  const total = data.getUTCMonth() + meses;
  const ano = data.getUTCFullYear() + Math.floor(total / 12);
  const mes0 = ((total % 12) + 12) % 12;
  return diaUtc(ano, mes0, Math.min(data.getUTCDate(), ultimoDiaDoMes(ano, mes0)));
}

export const competencia = (data: Date) => data.toISOString().slice(0, 7);
export const formatarData = (data: Date) => data.toISOString().slice(0, 10).split('-').reverse().join('/');
export const diasEntre = (de: Date, ate: Date) => Math.round((ate.getTime() - de.getTime()) / 86_400_000);
