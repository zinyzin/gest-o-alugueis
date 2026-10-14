import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as cliente, type Socket } from 'socket.io-client';
import { api, app, limparBanco, criarUsuario, criarImovel } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { iniciarRealtime, emitirParaImovel } from '../src/realtime.js';
import { marcarAtrasos } from '../src/rotinas/rotinas.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

async function aviso(imovelId: string, chave: string) {
  return prisma.notificacao.create({ data: { imovelId, tipo: 'REAJUSTE', titulo: 'Reajuste', mensagem: 'm', chave } });
}

describe('avisos', () => {
  it('cada pessoa vê os avisos dos seus imóveis e marca como lido só para si', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const val = await criarUsuario('val@teste.com');
    const intruso = await criarUsuario('intruso@teste.com');
    const imovelId = await criarImovel(dono);
    await api().post(`/api/imoveis/${imovelId}/compartilhar`).set('Authorization', `Bearer ${dono}`).send({ email: 'val@teste.com' }).expect(204);
    const n1 = await aviso(imovelId, 'a1');
    await aviso(imovelId, 'a2');

    const ver = (t: string, q = '') => api().get(`/api/notificacoes${q}`).set('Authorization', `Bearer ${t}`).expect(200);
    expect((await ver(dono)).body.totalNaoLidas).toBe(2);
    expect((await ver(intruso)).body).toEqual({ totalNaoLidas: 0, itens: [] });

    await api().post(`/api/notificacoes/${n1.id}/lida`).set('Authorization', `Bearer ${dono}`).expect(204);
    await api().post(`/api/notificacoes/${n1.id}/lida`).set('Authorization', `Bearer ${dono}`).expect(204); // repetir não quebra
    expect((await ver(dono)).body.totalNaoLidas).toBe(1);
    expect((await ver(dono, '?naoLidas=true')).body.itens).toHaveLength(1);
    expect((await ver(val)).body.totalNaoLidas).toBe(2); // a leitura é por pessoa

    await api().post(`/api/notificacoes/${n1.id}/lida`).set('Authorization', `Bearer ${intruso}`).expect(404);
    await api().post('/api/notificacoes/lidas').set('Authorization', `Bearer ${val}`).expect(204);
    expect((await ver(val)).body.totalNaoLidas).toBe(0);
    expect((await ver(dono)).body.totalNaoLidas).toBe(1);
  });
});

describe('tempo real', () => {
  let servidor: Server;
  let url: string;
  const sockets: Socket[] = [];
  beforeAll(async () => {
    servidor = createServer(app);
    iniciarRealtime(servidor);
    await new Promise<void>((ok) => servidor.listen(0, ok));
    url = `http://localhost:${(servidor.address() as AddressInfo).port}`;
    return () => {
      sockets.forEach((s) => s.close());
      servidor.close();
    };
  });

  const conectar = (token: string) =>
    new Promise<Socket>((ok, falha) => {
      const s = cliente(url, { auth: { token }, transports: ['websocket'] });
      sockets.push(s);
      s.on('connect', () => ok(s));
      s.on('connect_error', falha);
    });

  it('quem não tem acesso não entra na sala do imóvel nem recebe os eventos', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const intruso = await criarUsuario('intruso@teste.com');
    const imovelId = await criarImovel(dono);
    const sDono = await conectar(dono);
    const sIntruso = await conectar(intruso);
    const recebidos: string[] = [];
    sDono.on('receita:criada', () => recebidos.push('dono'));
    sIntruso.on('receita:criada', () => recebidos.push('intruso'));
    const erroIntruso = new Promise((ok) => sIntruso.once('erro', ok));

    sDono.emit('entrarImovel', imovelId);
    sIntruso.emit('entrarImovel', imovelId);
    await erroIntruso;
    await new Promise((ok) => setTimeout(ok, 200));
    emitirParaImovel(imovelId, 'receita:criada', { id: 'x' });
    await new Promise((ok) => setTimeout(ok, 300));
    expect(recebidos).toEqual(['dono']);
  });

  it('aviso criado pela rotina chega ao vivo a cada pessoa com acesso, mesmo fora da tela do imóvel', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const intruso = await criarUsuario('intruso@teste.com');
    const imovelId = await criarImovel(dono);
    await prisma.receita.create({
      data: { imovelId, dataRecebimento: new Date('2026-03-10T00:00:00Z'), descricao: 'Aluguel', valor: 1000, formaPagamento: 'PIX', status: 'PENDENTE' },
    });
    const sDono = await conectar(dono);
    const sIntruso = await conectar(intruso);
    const recebidos: string[] = [];
    sIntruso.on('notificacao:criada', () => recebidos.push('intruso'));
    const chegou = new Promise((ok) => sDono.once('notificacao:criada', ok));
    await marcarAtrasos(new Date('2026-03-11T00:00:00Z'));
    expect(await chegou).toMatchObject({ tipo: 'ALUGUEL_ATRASADO', imovelId });
    await new Promise((ok) => setTimeout(ok, 200));
    expect(recebidos).toEqual([]);
  });

  it('recusa conexão sem token válido', async () => {
    await expect(conectar('token-falso')).rejects.toThrow();
  });
});
