# Imagem full-stack: builda o web e o backend; o backend serve o web em /public.
# Deploy no Railway: builder = DOCKERFILE (ver railway.json).

# --- Etapa 1: build do frontend web ---
FROM node:20-alpine AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# --- Etapa 2: backend (build + runtime) ---
# Debian slim (não Alpine) para evitar problemas do Prisma com OpenSSL/musl.
FROM node:20-slim
WORKDIR /app
# OpenSSL é requerido pelos engines do Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate && npm run build
# Web buildado servido estaticamente pelo backend (mesma origem).
COPY --from=web /web/dist ./public

ENV NODE_ENV=production
EXPOSE 3333
# Aplica migrations pendentes e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
