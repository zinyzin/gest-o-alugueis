# Deploy

Por enquanto o sistema roda **no PC**, com o banco Postgres local (Docker) e acesso externo
pelo `cloudflared`. O Railway fica para depois (seção no fim).

## Produção no PC (modo atual)

Tudo pelo [`bin/prod`](../bin/prod):

| Comando | O que faz |
|---|---|
| `bin/prod setup` | Cria `~/.config/gestao-imovel/prod.env` (permissão 600) com `JWT_SECRET` aleatório e um `CODIGO_CONVITE`, e o banco `gestao_imovel_prod` no Postgres local. |
| `bin/prod on` | Builda a imagem, sobe o app em `127.0.0.1:3400` e liga o túnel público. Mostra o link `*.trycloudflare.com` (muda a cada `on`). |
| `bin/prod off` | Desliga o túnel e o app. O banco continua no ar. |
| `bin/prod status` | Estado do app e do túnel, com o link atual. |
| `bin/prod backup` | Cópia do banco agora, em `~/backups/gestao-imovel` (guarda as 30 mais recentes). |
| `bin/prod agendar-backup` | Instala o backup diário às 03:30 (timer do systemd do usuário). |

- **Separado do desenvolvimento:** banco `gestao_imovel_prod`, uploads num volume Docker próprio,
  segredos fora do repositório. O túnel usa a unidade `gestao-imovel-tunnel`, separada da do playbook.
- **Só nesta máquina:** app e banco escutam em `127.0.0.1`; de fora, só pelo túnel.
- **Criar conta:** com `CODIGO_CONVITE` definido (o `setup` define), a tela pede o código. Passe o
  código só a quem vai usar. Depois, compartilhe o imóvel pela tela de Cadastros.
- **Quick Tunnel** é um recurso de teste da Cloudflare, sem garantia de disponibilidade e com link
  que muda. Depois de reiniciar o PC, app e banco voltam sozinhos, mas o túnel não: rode
  `bin/prod on` de novo (link novo). Para link fixo, use um túnel nomeado (precisa de domínio na Cloudflare) ou o Railway.
- **Restaurar um backup:** `docker exec -i gestao-imovel-pg pg_restore -U gestao -d gestao_imovel_prod --clean < arquivo.dump`.

## Railway (depois)


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
   | `JWT_SECRET` | um segredo forte e aleatório (`openssl rand -hex 32`) |
   | `CODIGO_CONVITE` | código exigido para criar conta (recomendado) |
   | `TRUST_PROXY` | `1` (o Railway fica atrás de um proxy) |
   | `JWT_EXPIRES_IN` | `7d` (opcional) |
   | `CORS_ORIGIN` | a URL pública do app (opcional; mesma origem dispensa) |

   > `PORT` é injetado automaticamente pelo Railway — não defina manualmente.

4. **Deploy.** No start, o container roda `prisma migrate deploy` (aplica as migrations)
   e sobe a API. O healthcheck usa `GET /health`.
5. Gere um **domínio público** (Settings → Networking → Generate Domain) e acesse.

## Primeiro acesso

Crie a conta pela tela (**Criar conta**, com o código de convite) e cadastre o imóvel. Para dar
acesso a outra pessoa, ela cria a própria conta e você a adiciona em **Cadastros → Pessoas com acesso**.

## Observação sobre anexos

No PC, os uploads ficam no volume Docker `uploads` (persistente). No Railway o disco do container
é efêmero: antes de usar lá, trocar o storage local por um bucket (S3 / Cloudflare R2). O ponto
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
