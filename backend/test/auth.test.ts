import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, novoConvite } from './helpers.js';
import { prisma } from '../src/prisma.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

describe('autenticação', () => {
  it('registra, faz login e lê o próprio perfil', async () => {
    const token = await criarUsuario('ana@teste.com');
    const res = await api().get('/api/auth/eu').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.email).toBe('ana@teste.com');
    expect(res.body).not.toHaveProperty('senhaHash');
  });

  it('recusa e-mail duplicado', async () => {
    await criarUsuario('ana@teste.com');
    await api().post('/api/auth/registrar').send({ nome: 'Ana', email: 'ana@teste.com', senha: 'outra-senha', convite: await novoConvite() }).expect(409);
  });

  it('recusa senha errada e usuário inexistente com a mesma mensagem', async () => {
    await criarUsuario('ana@teste.com');
    const a = await api().post('/api/auth/login').send({ email: 'ana@teste.com', senha: 'errada' }).expect(401);
    const b = await api().post('/api/auth/login').send({ email: 'ninguem@teste.com', senha: 'errada' }).expect(401);
    expect(a.body.mensagem).toBe(b.body.mensagem);
  });

  it('exige token nas rotas protegidas', async () => {
    await api().get('/api/imoveis').expect(401);
    await api().get('/api/imoveis').set('Authorization', 'Bearer token-falso').expect(401);
  });
});
