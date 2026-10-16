-- Endereços de arquivo passam a ser só o caminho interno (/arquivos/<nome>).
-- Converte registros antigos gravados com a URL completa (ex.: http://localhost:3333/arquivos/x.pdf).
UPDATE "despesas" SET "comprovante_url" = regexp_replace("comprovante_url", '^https?://[^/]+(/arquivos/)', '\1')
  WHERE "comprovante_url" ~ '^https?://[^/]+/arquivos/';
UPDATE "contratos" SET "anexo_url" = regexp_replace("anexo_url", '^https?://[^/]+(/arquivos/)', '\1')
  WHERE "anexo_url" ~ '^https?://[^/]+/arquivos/';
UPDATE "imoveis" SET "fotos" = ARRAY(
  SELECT regexp_replace(f, '^https?://[^/]+(/arquivos/)', '\1') FROM unnest("fotos") AS f
) WHERE EXISTS (SELECT 1 FROM unnest("fotos") AS f WHERE f ~ '^https?://');
