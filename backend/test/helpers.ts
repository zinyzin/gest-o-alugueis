import request from 'supertest';
import { criarApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

export const app = criarApp();
export const api = () => request(app);

// Apaga todos os dados entre os testes (ordem respeita as chaves estrangeiras).
export async function limparBanco() {
  await prisma.despesa.deleteMany();
  await prisma.receita.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.inquilino.deleteMany();
  await prisma.usuarioImovel.deleteMany();
  await prisma.imovel.deleteMany();
  await prisma.usuario.deleteMany();
}

// Registra um usuário e devolve o token de acesso.
export async function criarUsuario(email: string, nome = email.split('@')[0]) {
  await api().post('/api/auth/registrar').send({ nome, email, senha: 'senha-segura-1' }).expect(201);
  const res = await api().post('/api/auth/login').send({ email, senha: 'senha-segura-1' }).expect(200);
  return res.body.token as string;
}

export async function criarImovel(token: string, endereco = 'Rua Teste, 1') {
  const res = await api().post('/api/imoveis').set('Authorization', `Bearer ${token}`).send({ endereco }).expect(201);
  return res.body.id as string;
}
