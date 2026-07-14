# Backend — API

API REST + WebSocket. Fonte única de verdade para web e mobile.

**Stack:** Node.js + Express + Prisma + PostgreSQL + Socket.IO (auth JWT).

## Setup (a implementar na Fase 0)

```bash
cd backend
npm install
cp .env.example .env   # configurar DATABASE_URL, JWT_SECRET
npm run dev
```

## Responsabilidades

- Autenticação e autorização (login, perfis admin/visualizador).
- CRUD: imóveis, inquilinos, contratos, receitas, despesas.
- Upload de anexos (contratos, comprovantes) para object storage.
- Emissão de eventos em tempo real por imóvel (Socket.IO).
- Relatórios e exportação (CSV/PDF).
