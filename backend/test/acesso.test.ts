import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, criarImovel } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/env.js';

beforeEach(limparBanco);
afterEach(() => {
  env.CODIGO_CONVITE = undefined;
});
afterAll(() => prisma.$disconnect());

describe('cadastro', () => {
  it('ignora tentativa de escolher o perfil ADMIN', async () => {
    await api().post('/api/auth/registrar').send({ nome: 'X', email: 'x@teste.com', senha: 'senha-segura-1', perfil: 'ADMIN' }).expect(201);
    expect((await prisma.usuario.findUnique({ where: { email: 'x@teste.com' } }))?.perfil).toBe('VISUALIZADOR');
  });

  it('com código de convite definido, exige o código correto', async () => {
    env.CODIGO_CONVITE = 'convite-secreto';
    expect((await api().get('/api/auth/config').expect(200)).body).toEqual({ conviteObrigatorio: true });
    const dados = { nome: 'X', email: 'x@teste.com', senha: 'senha-segura-1' };
    await api().post('/api/auth/registrar').send(dados).expect(403);
    await api().post('/api/auth/registrar').send({ ...dados, codigoConvite: 'errado' }).expect(403);
    await api().post('/api/auth/registrar').send({ ...dados, codigoConvite: 'convite-secreto' }).expect(201);
  });

  it('sem código definido, o cadastro é livre', async () => {
    expect((await api().get('/api/auth/config').expect(200)).body).toEqual({ conviteObrigatorio: false });
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
