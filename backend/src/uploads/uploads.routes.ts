import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { autenticar } from '../middleware/auth.js';

// Armazenamento local para desenvolvimento.
// Em produção, trocar por um storage adapter (S3 / Cloudflare R2) que
// retorne a URL pública — o restante do app só depende do campo `url`.
export const UPLOAD_DIR = new URL('../../uploads/', import.meta.url).pathname;
mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TAMANHO_MAX = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: TAMANHO_MAX },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de arquivo não permitido (use JPG, PNG, WEBP ou PDF)'));
  },
});

export const uploadsRouter = Router();
uploadsRouter.use(autenticar);

// POST /uploads (campo "arquivo") -> { url }
uploadsRouter.post('/', upload.single('arquivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ mensagem: 'Nenhum arquivo enviado' });
  const url = `${req.protocol}://${req.get('host')}/arquivos/${req.file.filename}`;
  res.status(201).json({ url, nome: req.file.originalname, tamanho: req.file.size });
});
