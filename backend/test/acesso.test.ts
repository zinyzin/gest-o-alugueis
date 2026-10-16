import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, criarImovel, novoConvite } from './helpers.js';
import { prisma } from '../src/prisma.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('cadastro', () => {
  it('ignora tentativa de escolher o perfil ADMIN', async () => {
    await api().post('/api/auth/registrar').send({ nome: 'X', email: 'x@teste.com', senha: 'senha-segura-1', perfil: 'ADMIN', convite: await novoConvite() }).expect(201);
    expect((await prisma.usuario.findUnique({ where: { email: 'x@teste.com' } }))?.perfil).toBe('VISUALIZADOR');
  });

  it('exige convite válido, de uso único e no prazo', async () => {
    const dados = { nome: 'X', email: 'x@teste.com', senha: 'senha-segura-1' };
    await api().post('/api/auth/registrar').send(dados).expect(400);
    await api().post('/api/auth/registrar').send({ ...dados, convite: 'inexistente' }).expect(403);

    const convite = await novoConvite();
    expect((await api().get(`/api/convites/${convite}`).expect(200)).body).toEqual({ valido: true });
    await api().post('/api/auth/registrar').send({ ...dados, convite }).expect(201);
    // Já usado: não serve de novo, nem para outro e-mail.
    await api().post('/api/auth/registrar').send({ ...dados, email: 'y@teste.com', convite }).expect(403);
    expect((await api().get(`/api/convites/${convite}`).expect(200)).body).toEqual({ valido: false });

    // Vencido.
    const vencido = await novoConvite();
    await prisma.convite.updateMany({ where: { usadoEm: null }, data: { expiraEm: new Date(Date.now() - 1000) } });
    await api().post('/api/auth/registrar').send({ ...dados, email: 'z@teste.com', convite: vencido }).expect(403);
  });

  it('cadastro com e-mail repetido não gasta o convite', async () => {
    await criarUsuario('x@teste.com');
    const convite = await novoConvite();
    await api().post('/api/auth/registrar').send({ nome: 'X', email: 'x@teste.com', senha: 's', convite }).expect(409);
    await api().post('/api/auth/registrar').send({ nome: 'Y', email: 'y@teste.com', senha: 's', convite }).expect(201);
  });

  it('senha sem tamanho mínimo', async () => {
    await api().post('/api/auth/registrar').send({ nome: 'X', email: 'x@teste.com', senha: '1', convite: await novoConvite() }).expect(201);
    await api().post('/api/auth/login').send({ email: 'x@teste.com', senha: '1' }).expect(200);
  });
});

describe('convites', () => {
  it('só quem tem conta gera convite, com prazo escolhido', async () => {
    await api().post('/api/convites').send({}).expect(401);
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    await api().post('/api/convites').set(auth).send({ minutos: 999 }).expect(400);

    const antes = Date.now();
    const res = await api().post('/api/convites').set(auth).send({ minutos: 30 }).expect(201);
    const expira = new Date(res.body.expiraEm).getTime();
    expect(expira - antes).toBeGreaterThanOrEqual(29 * 60_000);
    expect(expira - antes).toBeLessThanOrEqual(31 * 60_000);
    // O banco guarda só o hash do token.
    expect(await prisma.convite.count({ where: { tokenHash: res.body.token } })).toBe(0);
    // Padrão: 2 h.
    const padrao = await api().post('/api/convites').set(auth).send({}).expect(201);
    expect(new Date(padrao.body.expiraEm).getTime() - Date.now()).toBeGreaterThan(119 * 60_000);

    await api().post('/api/auth/registrar').send({ nome: 'Val', email: 'val@teste.com', senha: 'x', convite: res.body.token }).expect(201);
  });
});

describe('pessoas com acesso', () => {
  it('lista, compartilha e remove acesso; o imóvel nunca fica sem ninguém', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const val = await criarUsuario('val@teste.com');
    const auth = { Authorization: `Bearer ${dono}` };
    const imovelId = await criarImovel(dono);

    await api().post(`/api/imoveis/${imovelId}/compartilhar`).set(auth).send({ email: 'naoexiste@teste.com' }).expect(404);
    await api().post(`/api/imoveis/${imovelId}/compartilhar`).set(auth).send({ email: 'val@teste.com' }).expect(204);
    const lista = await api().get(`/api/imoveis/${imovelId}/usuarios`).set(auth).expect(200);
    expect(lista.body.map((u: { email: string }) => u.email).sort()).toEqual(['dono@teste.com', 'val@teste.com']);
    expect(lista.body[0]).not.toHaveProperty('senhaHash');

    const idVal = lista.body.find((u: { email: string }) => u.email === 'val@teste.com').id;
    await api().delete(`/api/imoveis/${imovelId}/usuarios/${idVal}`).set(auth).expect(204);
    await api().get(`/api/receitas?imovelId=${imovelId}`).set('Authorization', `Bearer ${val}`).expect(403);

    const idDono = lista.body.find((u: { email: string }) => u.email === 'dono@teste.com').id;
    await api().delete(`/api/imoveis/${imovelId}/usuarios/${idDono}`).set(auth).expect(400);
  });

  it('quem não tem acesso não lista nem remove pessoas', async () => {
    const dono = await criarUsuario('dono@teste.com');
    const intruso = await criarUsuario('intruso@teste.com');
    const imovelId = await criarImovel(dono);
    const idDono = (await prisma.usuario.findUnique({ where: { email: 'dono@teste.com' } }))!.id;
    await api().get(`/api/imoveis/${imovelId}/usuarios`).set('Authorization', `Bearer ${intruso}`).expect(403);
    await api().delete(`/api/imoveis/${imovelId}/usuarios/${idDono}`).set('Authorization', `Bearer ${intruso}`).expect(403);
  });
});
