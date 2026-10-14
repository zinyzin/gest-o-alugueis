import { afterAll, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario } from './helpers.js';
import { prisma } from '../src/prisma.js';
import { env } from '../src/env.js';

afterAll(() => prisma.$disconnect());

describe('limite de tentativas', () => {
  it('bloqueia com 429 depois de muitas senhas erradas, sem contar os acertos', async () => {
    await limparBanco();
    await criarUsuario('alvo@teste.com');
    env.LIMITE_LOGIN = 3;
    try {
      // Acertos não contam.
      for (let i = 0; i < 5; i++) await api().post('/api/auth/login').send({ email: 'alvo@teste.com', senha: 'senha-segura-1' }).expect(200);
      for (let i = 0; i < 3; i++) await api().post('/api/auth/login').send({ email: 'alvo@teste.com', senha: 'errada' }).expect(401);
      const bloqueado = await api().post('/api/auth/login').send({ email: 'alvo@teste.com', senha: 'senha-segura-1' }).expect(429);
      expect(bloqueado.body.mensagem).toMatch(/Muitas tentativas/);
    } finally {
      env.LIMITE_LOGIN = 10;
    }
  });

  it('limita cadastros por endereço', async () => {
    env.LIMITE_CADASTRO = 2;
    try {
      const dados = (n: number) => ({ nome: 'X', email: `c${n}-${Date.now()}@teste.com`, senha: 'senha-segura-1' });
      // O limite de cadastro já contou os usuários criados acima neste arquivo.
      let ultimo = 0;
      for (let i = 0; i < 4; i++) ultimo = (await api().post('/api/auth/registrar').send(dados(i))).status;
      expect(ultimo).toBe(429);
    } finally {
      env.LIMITE_CADASTRO = 10000;
    }
  });
});

describe('cabeçalhos', () => {
  it('respostas trazem os cabeçalhos de segurança', async () => {
    const res = await api().get('/health').expect(200);
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
