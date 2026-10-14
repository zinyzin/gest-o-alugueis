import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { autenticar } from '../middleware/auth.js';

// Armazenamento local (PC). Para S3/R2 depois, basta outro adapter que devolva o campo `url`.
export const UPLOAD_DIR = new URL('../../uploads/', import.meta.url).pathname;
mkdirSync(UPLOAD_DIR, { recursive: true });

const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB

// Tipo real do arquivo pelos primeiros bytes (assinatura), não pelo que o navegador declara.
// A extensão salva vem daqui: um .html disfarçado de imagem nunca é gravado como .html.
async function detectarTipo(caminho: string): Promise<'jpg' | 'png' | 'webp' | 'pdf' | null> {
  const arquivo = await open(caminho, 'r');
  try {
    const { buffer } = await arquivo.read(Buffer.alloc(12), 0, 12, 0);
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    if (buffer.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
    return null;
  } finally {
    await arquivo.close();
  }
}

const upload = multer({
  // Grava com nome aleatório e sem extensão; a extensão só é dada depois da conferência.
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.tmp`),
  }),
  limits: { fileSize: TAMANHO_MAX, files: 1 },
});

export const uploadsRouter = Router();
uploadsRouter.use(autenticar);

// POST /uploads (campo "arquivo") -> { url } relativa, ex.: /arquivos/<uuid>.jpg
uploadsRouter.post('/', upload.single('arquivo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ mensagem: 'Nenhum arquivo enviado' });
    const tipo = await detectarTipo(req.file.path);
    if (!tipo) {
      await unlink(req.file.path);
      return res.status(400).json({ mensagem: 'Tipo de arquivo não permitido (use JPG, PNG, WEBP ou PDF)' });
    }
    const nome = req.file.filename.replace(/\.tmp$/, `.${tipo}`);
    await rename(req.file.path, join(UPLOAD_DIR, nome));
    res.status(201).json({ url: `/arquivos/${nome}`, nome: req.file.originalname, tamanho: req.file.size });
  } catch (err) {
    next(err);
  }
});
