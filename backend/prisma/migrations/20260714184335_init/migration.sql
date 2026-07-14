-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'BOLETO', 'TRANSFERENCIA', 'DINHEIRO', 'CARTAO');

-- CreateEnum
CREATE TYPE "StatusReceita" AS ENUM ('PAGO', 'ATRASADO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "IndiceReajuste" AS ENUM ('IGPM', 'IPCA', 'INPC', 'OUTRO');

-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('AGUA', 'LUZ', 'IPTU', 'CONDOMINIO', 'MANUTENCAO', 'REFORMA', 'IMPOSTOS', 'OUTRO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'VISUALIZADOR',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_imoveis" (
    "usuario_id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,

    CONSTRAINT "usuarios_imoveis_pkey" PRIMARY KEY ("usuario_id","imovel_id")
);

-- CreateTable
CREATE TABLE "imoveis" (
    "id" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "descricao" TEXT,
    "fotos" TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquilinos" (
    "id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf_cnpj" TEXT,
    "telefone" TEXT,
    "email" TEXT,

    CONSTRAINT "inquilinos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "inquilino_id" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3),
    "valor_aluguel" DECIMAL(12,2) NOT NULL,
    "dia_vencimento" INTEGER NOT NULL,
    "indice_reajuste" "IndiceReajuste" NOT NULL DEFAULT 'IGPM',
    "data_ultimo_reajuste" TIMESTAMP(3),
    "valor_caucao" DECIMAL(12,2),
    "anexo_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "inquilino_id" TEXT,
    "data_recebimento" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma_pagamento" "FormaPagamento" NOT NULL,
    "status" "StatusReceita" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "data_pagamento" TIMESTAMP(3) NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL,
    "descricao" TEXT NOT NULL,
    "fornecedor" TEXT,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma_pagamento" "FormaPagamento" NOT NULL,
    "comprovante_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "usuarios_imoveis" ADD CONSTRAINT "usuarios_imoveis_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_imoveis" ADD CONSTRAINT "usuarios_imoveis_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquilinos" ADD CONSTRAINT "inquilinos_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_inquilino_id_fkey" FOREIGN KEY ("inquilino_id") REFERENCES "inquilinos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_inquilino_id_fkey" FOREIGN KEY ("inquilino_id") REFERENCES "inquilinos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
