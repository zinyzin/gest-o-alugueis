# Gestão Financeira de Imóvel Alugado

Aplicação **web + mobile (Android)** para registrar, acompanhar e analisar receitas e
despesas de um imóvel alugado, com acesso simultâneo e colaboração em tempo real entre
múltiplos usuários.

Este é um **monorepo** com três aplicações que compartilham a mesma API e banco de dados:

```
gestao-imovel-alugado/
├── backend/   # API REST + WebSocket (fonte única de verdade)
├── web/       # Web App (navegador, responsivo)
├── mobile/    # App Android (APK)
└── docs/      # Documentação de arquitetura e planejamento
```

---

## 1. Proposta de Arquitetura

```
                 ┌─────────────────────────────┐
                 │        Railway (nuvem)       │
                 │                              │
   ┌────────┐    │   ┌─────────┐  ┌──────────┐  │
   │  Web   │◄───┼──►│ Backend │◄─│PostgreSQL│  │
   │ (React)│    │   │ Node/   │  └──────────┘  │
   └────────┘    │   │ Express │  ┌──────────┐  │
   ┌────────┐    │   │ + WS    │◄─│  Storage │  │ (anexos: contratos,
   │ Mobile │◄───┼──►│         │  │ (S3/R2)  │  │  comprovantes)
   │(RN/Expo)│   │   └─────────┘  └──────────┘  │
   └────────┘    └─────────────────────────────┘
```

- **Backend único** serve tanto o web quanto o mobile → dados sempre consistentes.
- **Tempo real** via WebSocket (canal por imóvel): qualquer alteração é propagada
  instantaneamente para todos os dispositivos conectados.
- **PostgreSQL na nuvem** (Railway) garante persistência e acesso compartilhado 24/7.
- **Object storage** (Cloudflare R2 ou S3) para anexos (PDFs de contratos, comprovantes).

## 2. Stack Tecnológica Recomendada

| Componente   | Tecnologia                              | Por quê |
|--------------|-----------------------------------------|---------|
| Backend      | **Node.js + Express + Prisma**          | Compartilha linguagem/tipos com o front; ecossistema WebSocket maduro |
| Tempo real   | **Socket.IO**                           | Reconexão automática, salas por imóvel, fallback |
| Banco        | **PostgreSQL**                          | Relacional (contratos, inquilinos, lançamentos), robusto no Railway |
| Web          | **React + Vite + TanStack Query**       | Rápido, responsivo, cache e sincronização de dados |
| Mobile       | **React Native (Expo)**                 | Compartilha lógica/tipos com o web; gera APK Android |
| Auth         | **JWT + bcrypt**                        | Login e-mail/senha, perfis de acesso (admin/visualizador) |
| Compartilhado| **TypeScript** em todo o stack          | Tipos de domínio (`Contrato`, `Receita`, `Despesa`) reutilizados web+mobile |
| Deploy       | **Railway**                             | Frontend, backend e banco no mesmo lugar, deploy full-stack |

> Alternativa Python: se preferir **FastAPI + SQLModel** no backend (você já estuda FastAPI),
> a arquitetura é a mesma — troca-se Express por FastAPI e Socket.IO por WebSockets nativos
> do FastAPI. O web/mobile em React/React Native permanecem iguais.

## 3. Plano de Desenvolvimento (alto nível)

- **Fase 0 — Fundação:** monorepo, CI, deploy vazio no Railway, modelagem do banco (Prisma), autenticação (login, JWT, perfis).
- **Fase 1 — Cadastros:** imóvel, inquilinos, contratos (com reajuste, caução, anexo do contrato).
- **Fase 2 — Financeiro:** receitas e despesas (categorias, status pago/atrasado/pendente, anexo de comprovante).
- **Fase 3 — Dashboard e relatórios:** resumo do período, gráficos por categoria, fluxo de caixa, inadimplência, exportação CSV/PDF.
- **Fase 4 — Tempo real:** WebSocket, sincronização web↔mobile, resolução de conflitos.
- **Fase 5 — Mobile:** paridade de funcionalidades no Expo, build e geração do APK.
- **Fase 6 — Notificações:** lembretes de vencimento, reajuste e contas a pagar.

## 4. Colaboração em Tempo Real, Sincronização e Segurança

- **Tempo real:** cada imóvel é uma "sala" Socket.IO; ao criar/editar um lançamento, o
  backend persiste e emite o evento para todos os clientes da sala.
- **Sincronização web↔mobile:** ambos consomem a mesma API; o mobile mantém cache local
  (offline-first) e reconcilia ao reconectar.
- **Segurança:** senhas com bcrypt, JWT com expiração, validação de entrada (Zod),
  proteção XSS/CSRF, HTTPS (Railway), autorização por perfil e por imóvel.

Veja detalhes em [`docs/`](docs/).

## Começando

Cada módulo tem seu próprio README com instruções:
[`backend/`](backend/README.md) · [`web/`](web/README.md) · [`mobile/`](mobile/README.md)
