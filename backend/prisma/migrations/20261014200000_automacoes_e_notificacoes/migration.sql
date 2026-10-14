-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('ALUGUEL_ATRASADO', 'REAJUSTE', 'CONTRATO_VENCENDO');

-- AlterTable
ALTER TABLE "receitas" ADD COLUMN     "competencia" TEXT,
ADD COLUMN     "contrato_id" TEXT;

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "contrato_id" TEXT,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes_leituras" (
    "usuario_id" TEXT NOT NULL,
    "notificacao_id" TEXT NOT NULL,
    "lida_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_leituras_pkey" PRIMARY KEY ("usuario_id","notificacao_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_chave_key" ON "notificacoes"("chave");

-- CreateIndex
CREATE INDEX "notificacoes_imovel_id_criado_em_idx" ON "notificacoes"("imovel_id", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "receitas_contrato_id_competencia_key" ON "receitas"("contrato_id", "competencia");

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_leituras" ADD CONSTRAINT "notificacoes_leituras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_leituras" ADD CONSTRAINT "notificacoes_leituras_notificacao_id_fkey" FOREIGN KEY ("notificacao_id") REFERENCES "notificacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

