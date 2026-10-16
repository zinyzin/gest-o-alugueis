import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, limparBanco, criarUsuario, criarImovel } from './helpers.js';
import { prisma } from '../src/prisma.js';

beforeEach(limparBanco);
afterAll(() => prisma.$disconnect());

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b40000000049454e44ae426082', 'hex');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const HTML = Buffer.from('<html><script>alert(1)</script></html>');

describe('upload', () => {
  it('aceita imagem e PDF pelo conteúdo e devolve endereço relativo com a extensão certa', async () => {
    const token = await criarUsuario('dono@teste.com');
    const png = await api().post('/api/uploads').set('Authorization', `Bearer ${token}`).attach('arquivo', PNG, 'foto.jpeg').expect(201);
    expect(png.body.url).toMatch(/^\/arquivos\/[\w-]+\.png$/);
    const pdf = await api().post('/api/uploads').set('Authorization', `Bearer ${token}`).attach('arquivo', PDF, 'contrato.pdf').expect(201);
    expect(pdf.body.url).toMatch(/\.pdf$/);

    const servido = await api().get(png.body.url).expect(200);
    expect(servido.headers['content-type']).toBe('image/png');
    expect(servido.headers['x-content-type-options']).toBe('nosniff');
  });

  it('recusa HTML disfarçado de imagem e não grava nada', async () => {
    const token = await criarUsuario('dono@teste.com');
    await api()
      .post('/api/uploads')
      .set('Authorization', `Bearer ${token}`)
      .attach('arquivo', HTML, { filename: 'foto.html', contentType: 'image/png' })
      .expect(400);
  });

  it('exige login', async () => {
    await api().post('/api/uploads').attach('arquivo', PNG, 'foto.png').expect(401);
  });

  it('fotos do imóvel só aceitam endereços de arquivo válidos', async () => {
    const token = await criarUsuario('dono@teste.com');
    const auth = { Authorization: `Bearer ${token}` };
    const imovelId = await criarImovel(token);
    const up = await api().post('/api/uploads').set(auth).attach('arquivo', PNG, 'foto.png').expect(201);
    const r = await api().put(`/api/imoveis/${imovelId}`).set(auth).send({ fotos: [up.body.url] }).expect(200);
    expect(r.body.fotos).toEqual([up.body.url]);
    await api().put(`/api/imoveis/${imovelId}`).set(auth).send({ fotos: ['javascript:alert(1)'] }).expect(400);
    await api().put(`/api/imoveis/${imovelId}`).set(auth).send({ fotos: ['/arquivos/../../.env'] }).expect(400);
  });
});

describe('endereços de arquivo', () => {
  it('recusa URL de outro site mesmo com caminho /arquivos/', async () => {
    const token = await criarUsuario('dono@teste.com');
    const imovelId = await criarImovel(token);
    await api()
      .put(`/api/imoveis/${imovelId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fotos: ['https://site-malicioso.com/arquivos/a.png'] })
      .expect(400);
  });
});
