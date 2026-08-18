# Deploy no Railway

A aplicação é **full-stack em um único serviço**: o backend (Node/Express) serve a
API sob `/api` e o web (React) buildado como estático (mesma origem → sem CORS e com
Socket.IO direto). Tudo empacotado pelo [`Dockerfile`](../Dockerfile) na raiz.

## Passo a passo

1. **Crie o projeto no Railway** e adicione um banco **PostgreSQL** (New → Database → PostgreSQL).
2. **Adicione o serviço da aplicação** a partir deste repositório do GitHub
   (`zinyzin/gest-o-alugueis`). O Railway detecta o `Dockerfile` (ver [`railway.json`](../railway.json)).
3. **Configure as variáveis de ambiente** do serviço da aplicação:

   | Variável | Valor |
   |----------|-------|
   | `DATABASE_URL` | referência ao Postgres: `${{Postgres.DATABASE_URL}}` |
   | `JWT_SECRET` | um segredo forte e aleatório (≥ 16 caracteres) |
   | `JWT_EXPIRES_IN` | `7d` (opcional) |
   | `CORS_ORIGIN` | a URL pública do app (opcional; mesma origem dispensa) |

   > `PORT` é injetado automaticamente pelo Railway — não defina manualmente.

4. **Deploy.** No start, o container roda `prisma migrate deploy` (aplica as migrations)
   e sobe a API. O healthcheck usa `GET /health`.
5. Gere um **domínio público** (Settings → Networking → Generate Domain) e acesse.

## Primeiro acesso

Ainda não há tela de cadastro de usuário na UI. Crie o primeiro usuário via API:

```bash
curl -X POST https://SEU-APP.up.railway.app/api/auth/registrar \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Seu Nome","email":"voce@email.com","senha":"suaSenha","perfil":"ADMIN"}'
```

Depois é só logar pela interface. Para dar acesso ao segundo usuário, use a rota
`POST /api/imoveis/:id/compartilhar` com `{ "email": "outro@email.com" }` (o outro
usuário precisa já ter se registrado).

## Observação sobre anexos

Em produção os uploads vão para o disco do container (efêmero — somem em cada deploy).
Antes de uso real, trocar o storage local por um bucket (S3 / Cloudflare R2). O ponto
de troca está isolado em [`backend/src/uploads/uploads.routes.ts`](../backend/src/uploads/uploads.routes.ts).

## Rodar a imagem localmente (como em produção)

```bash
docker build -t gestao-imovel .
docker run --rm --network host \
  -e DATABASE_URL="postgresql://gestao:gestao@localhost:5433/gestao_imovel?schema=public" \
  -e JWT_SECRET="um-segredo-de-teste-bem-grande" \
  -e PORT=3333 gestao-imovel
# App completo em http://localhost:3333
```
