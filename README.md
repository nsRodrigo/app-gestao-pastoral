# Dízimo Conectado

> Mais fé, mais pessoas, mais missão.

Sistema de gestão pastoral, administrativa e financeira do dízimo. Este
repositório está na **Fase 1 — Fundação** (ver `docs/ARQUITETURA.md` para o
roteiro completo das fases seguintes).

## Stack

- **apps/api** — Backend NestJS + TypeScript + Prisma/PostgreSQL
- **apps/web** — Painel administrativo/PWA em Next.js (App Router) + TypeScript
- **packages/shared** — Tipos, enums e schemas Zod compartilhados

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL 16 (via `docker-compose.yml` ou instância local)

## Como rodar localmente

```bash
# 1. Instalar dependências
pnpm install

# 2. Subir o Postgres
docker compose up -d

# 3. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 4. Build do pacote compartilhado (necessário antes da API/Web)
pnpm --filter @gestao-pastoral/shared build

# 5. Migrations + seed
pnpm --filter @gestao-pastoral/api prisma:migrate
pnpm --filter @gestao-pastoral/api prisma:seed

# 6. Rodar em dev (dois terminais)
pnpm dev:api   # http://localhost:3001/api
pnpm dev:web   # http://localhost:3000
```

Credenciais de teste (seed), senha `SenhaForte123` para todas:

| Perfil | E-mail |
|---|---|
| Super Administrador | superadmin@dizimoconectado.com.br |
| Pároco | paroco@nsgruta.org.br |
| Tesoureiro | tesoureiro@nsgruta.org.br |
| Secretaria | secretaria@nsgruta.org.br |
| Coordenador do Dízimo | coordenador@nsgruta.org.br |
| Apoiador | apoiador@nsgruta.org.br |
| Dizimista | maria.silva@example.com |

## Testes

```bash
# Backend: unitários
pnpm --filter @gestao-pastoral/api test

# Backend: integração/E2E (requer banco de teste — ver apps/api/.env.test.example)
pnpm --filter @gestao-pastoral/api test:e2e

# Pacote compartilhado
pnpm --filter @gestao-pastoral/shared test
```

## Documentação

- `docs/ARQUITETURA.md` — decisões de arquitetura e roteiro de fases.
