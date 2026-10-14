import { env } from '../env.js';
import { hojeNoFuso } from './datas.js';
import { executarRotinas } from './rotinas.js';

// Roda as rotinas ao subir e depois a cada hora. Como são idempotentes, repetir não duplica
// nada; rodar de hora em hora só garante que a virada do dia seja percebida logo.
export function iniciarAgendador() {
  let rodando = false;
  const rodar = async () => {
    if (rodando) return;
    rodando = true;
    try {
      const r = await executarRotinas(hojeNoFuso(env.FUSO_HORARIO));
      if (r.alugueis || r.atrasos || r.reajustes || r.fins) console.log('⏰ rotinas:', r);
    } catch (err) {
      console.error('Falha nas rotinas diárias:', err);
    } finally {
      rodando = false;
    }
  };
  void rodar();
  return setInterval(rodar, 60 * 60 * 1000);
}
