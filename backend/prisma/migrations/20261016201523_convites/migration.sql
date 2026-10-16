-- CreateTable
CREATE TABLE "convites" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "criado_por_id" TEXT,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_hash_key" ON "convites"("token_hash");

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
