# Guia de Teste Local — Dízimo Conectado

Guia passo a passo para subir a aplicação completa (API + Web + Postgres) na
sua máquina e testar visualmente, incluindo contas mockadas e as regras de
negócio da Fase 1 (Fundação). Baseado na sessão de teste local realizada em
2026-09-20.

> Ver também `README.md` (resumo rápido) e `docs/ARQUITETURA.md` (decisões de
> arquitetura completas).

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Observação |
|---|---|---|
| Node.js | 20+ | Testado com Node 24 sem problemas |
| pnpm | 10.33.0 | `packageManager` fixado no `package.json` raiz |
| Docker Desktop | qualquer recente | Necessário para o Postgres local. Se não tiver instalado: `winget install --id Docker.DockerDesktop -e --source winget` (Windows). Requer WSL2 habilitado. |

Verifique rapidamente:

```bash
node -v
pnpm -v
docker info   # deve responder sem erro; se der erro, abra o Docker Desktop e espere o ícone ficar "Running"
```

---

## 2. Atalho: scripts .bat (Windows)

Para não repetir os comandos manualmente, use os scripts na raiz do repo:

- **`dev-up.bat`** — primeiro encerra qualquer instância anterior da API/Web
  (pela janela nomeada ou pelas portas 3000/3001, mesmo que tenham sido
  iniciadas manualmente), depois roda os passos da seção abaixo (install,
  sobe Postgres, `.env`, build do shared, prisma generate/migrate/seed) e
  abre a API e o Web, cada um em sua própria janela de terminal. Pode ser
  rodado várias vezes seguidas sem se preocupar com conflito de porta.
- **`dev-down.bat`** — fecha as janelas da API/Web e derruba o Postgres
  (`docker compose down`, mantendo os dados no volume).

```bat
dev-up.bat
:: ... testar em http://localhost:3000 ...
dev-down.bat
```

Se preferir rodar manualmente ou estiver em Linux/macOS, siga o passo a
passo abaixo.

## 3. Passo a passo manual (para subir tudo do zero)

```bash
# 1. Instalar dependências do monorepo
pnpm install --frozen-lockfile

# 2. Subir o Postgres (usa o docker-compose.yml da raiz)
docker compose up -d postgres

# 3. Configurar variáveis de ambiente (copiar exemplos)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# 4. Build do pacote compartilhado (obrigatório antes da API/Web,
#    pois ambos importam @gestao-pastoral/shared)
pnpm --filter @gestao-pastoral/shared build

# 5. Gerar o Prisma Client
pnpm --filter @gestao-pastoral/api prisma:generate

# 6. Rodar as migrations no banco de dev
pnpm --filter @gestao-pastoral/api prisma:migrate

# 7. Popular o banco com dados de teste (contas mockadas, ver seção 4)
pnpm --filter @gestao-pastoral/api prisma:seed

# 8. Subir a API e o Web (em dois terminais separados)
pnpm --filter @gestao-pastoral/api dev   # http://localhost:3001/api
pnpm --filter @gestao-pastoral/web dev   # http://localhost:3000
```

Depois de subir, acesse **http://localhost:3000** — você será redirecionado
para `/login`.

### Encerrando tudo

```bash
# Ctrl+C nos terminais da API e do Web, depois:
docker compose down          # para o Postgres mantendo os dados (volume persistido)
docker compose down -v       # para o Postgres E apaga os dados (reset total)
```

---

## 4. Contas mockadas (seed)

Todas usam a mesma senha: **`SenhaForte123`**

| Perfil | E-mail | Observação |
|---|---|---|
| Super Administrador | `superadmin@dizimoconectado.com.br` | Sem organização associada — o Dashboard atual mostra erro "Usuário sem organização associada" ao logar com ele. Isso é esperado nesta fase: não há tela própria para o Super Admin ainda, apenas o flag `isSuperAdmin` no RBAC. |
| Pároco | `paroco@nsgruta.org.br` | Perfil recomendado para testar o fluxo completo (Dashboard, Dizimistas, Famílias, Auditoria) |
| Tesoureiro | `tesoureiro@nsgruta.org.br` | Vê valores financeiros dos dizimistas |
| Secretaria | `secretaria@nsgruta.org.br` | Cadastra/edita dizimistas e famílias, mas **não** vê valores financeiros |
| Coordenador do Dízimo | `coordenador@nsgruta.org.br` | Cadastra/edita + vê valores financeiros |
| Apoiador | `apoiador@nsgruta.org.br` | Apenas cadastro rápido de novos dizimistas (ex.: durante celebrações) |
| Dizimista | `maria.silva@example.com` | Acesso de dizimista comum, sem permissões administrativas |

Organização seedada: **Paróquia Nossa Senhora da Gruta** (slug
`nossa-senhora-da-gruta`), com 3 famílias (Silva, Santos, Oliveira) e 5
dizimistas (4 ativos, 1 inativo).

---

## 5. Regras de negócio (Fase 1 — Fundação)

### 5.1 Multi-tenancy
- Cada tabela de domínio tem `organizationId`; toda query é escopada pela
  organização do usuário autenticado (`OrganizationScopeGuard`).
- Usuário de uma organização **nunca** pode acessar dados de outra
  (isolamento tipo IDOR é coberto por testes dedicados).

### 5.2 Perfis de acesso (RBAC)
Perfis: `SUPER_ADMIN`, `PAROCO`, `TESOUREIRO`, `SECRETARIA`,
`COORDENADOR_DIZIMO`, `APOIADOR`, `DIZIMISTA`.

- **SUPER_ADMIN** não usa `UserRole` (que é sempre escopado a uma
  organização) — é identificado pelo flag `User.isSuperAdmin`. Ganha todas
  as permissões automaticamente.
- Um mesmo usuário pode, no futuro, ter perfis diferentes em organizações
  diferentes (`UserRole` é por organização).
- **Desde 2026-09-20, a matriz de permissões é customizável por
  organização** (tela "Perfis e Permissões" no menu, visível só para
  Pároco e Super Admin): cada paróquia pode liberar/travar, por perfil, o
  que ele vê ou vê e edita — ex.: dar ao Apoiador acesso a valores
  recebidos, ou à Secretaria acesso a valores que por padrão só o
  Tesoureiro vê. `SUPER_ADMIN`, `PAROCO` e `DIZIMISTA` ficam sempre fixos
  (não entram na matriz); só `TESOUREIRO`, `SECRETARIA`,
  `COORDENADOR_DIZIMO` e `APOIADOR` são customizáveis. Uma mudança na
  matriz só passa a valer para o usuário afetado no próximo
  `POST /auth/refresh` (até 15 min, mesmo comportamento de uma troca de
  papel) — não precisa de re-login completo, mas também não é instantâneo.

Permissões padrão por perfil (usadas para popular a matriz de cada nova
organização — depois disso, cada uma pode ser customizada independentemente):

| Perfil | Permissões |
|---|---|
| SUPER_ADMIN | todas (fixo) |
| PAROCO | ver dizimistas, ver famílias, ver auditoria (fixo; valores financeiros individuais dependem da flag `parocoPodeVerValoresIndividuais` da organização) |
| TESOUREIRO | ver dizimistas + valores financeiros, ver famílias |
| SECRETARIA | criar/ver/editar/arquivar dizimistas, criar/ver/editar famílias — **sem** ver valores financeiros individuais por padrão |
| COORDENADOR_DIZIMO | mesmo que SECRETARIA + ver valores financeiros |
| APOIADOR | apenas criar e ver dizimistas (cadastro rápido) |
| DIZIMISTA | nenhuma permissão administrativa (fixo; acessa só a própria área) |

### 5.3 Dinheiro
- Todo valor monetário é armazenado como **inteiro em centavos**
  (`amountCents`), nunca `float`. Conversão para R$ só na apresentação.

### 5.4 Cadastro de dizimista (Member)
- **Nenhum campo financeiro é obrigatório** — não se exige valor de
  contribuição para alguém ser considerado dizimista.
- Campos obrigatórios: apenas nome completo e aceite dos termos
  (`termsAccepted`).
- CPF, quando informado, é validado (dígitos verificadores) e normalizado.
- `status`: `ATIVO`, `INATIVO` ou `ARQUIVADO`.
- `contributionFrequency`: `MENSAL`, `TRIMESTRAL`, `ANUAL` ou `AVULSO`.
- `contributionPreference`: `PIX`, `CARTAO`, `DINHEIRO` ou `TRANSFERENCIA`.
- Existe um fluxo de **cadastro rápido** (`QuickRegisterMemberSchema`),
  usado pelo botão "Novo Dizimista" e pelo app do Apoiador durante
  celebrações — pede só nome, contato opcional e aceite dos termos.
- Cada dizimista recebe um código único (`qrCodeToken`, prefixo `DIZ-`) para
  a "carteirinha digital".

### 5.5 Auditoria
- Toda operação sensível (mudança de permissão, exclusão lógica, etc.)
  grava um `AuditLog` (usuário, ação, entidade, valor anterior/novo, IP,
  timestamp).
- `AuditLog` é **append-only**: não existe endpoint de update/delete para
  usuários comuns.

### 5.6 Autenticação e sessão
- JWT de acesso (curta duração, padrão 15 min) + refresh token (30 dias,
  revogável no banco) + Argon2 para hash de senha.
- Sessão web via cookies `httpOnly` (`access_token`, `refresh_token`,
  `session`) — nunca expostos a `localStorage`/JS do cliente.
- Um 401 durante navegação redireciona para `/login` (sessão expira após
  15 min de inatividade). Refresh silencioso automático ainda não existe
  nesta fase.
- Política de senha: mínimo 8 caracteres, com ao menos uma letra e um
  número.

### 5.7 Navegação
- A barra lateral do painel só lista módulos que (a) o usuário tem
  permissão para acessar e (b) já existem na fase atual — nunca aparece um
  link "morto".

### 5.8 Roadmap (fases seguintes, ainda não implementadas)
1. ~~Fundação~~ (concluída): arquitetura, RBAC, organizações, famílias,
   dizimistas, painel web, CI.
2. Financeiro: contribuições, métodos, QR Code, recibos, dashboard.
3. Pagamentos: Pix, cartão, webhooks, recorrência, conciliação.
4. Pastoral: cuidado pastoral, oração, aniversários, comunicação, eventos.
5. Transparência: receitas, despesas, categorias, prestação de contas.
6. Qualidade: testes, cobertura, segurança, auditoria, performance.
7. Deploy: CI/CD, homologação, produção, monitoramento, backup.

---

## 6. Testes automatizados

O `docker-compose.yml` só cria o banco `gestao_pastoral` (dev). Para rodar
os testes de integração/E2E localmente, crie também o banco de teste e
aplique as migrations nele (só precisa fazer isso uma vez):

```bash
cp apps/api/.env.test.example apps/api/.env.test

docker exec gestao-pastoral-postgres psql -U postgres -c "CREATE DATABASE gestao_pastoral_test;"

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gestao_pastoral_test?schema=public" \
  npx --prefix apps/api prisma migrate deploy
```

```bash
# Unitários (shared + api)
pnpm --filter @gestao-pastoral/shared test
pnpm --filter @gestao-pastoral/api test

# Integração/E2E da API (usa apps/api/.env.test — banco separado do dev)
pnpm --filter @gestao-pastoral/api test:e2e

# Lint e typecheck (o que o CI roda)
pnpm --filter @gestao-pastoral/shared lint
pnpm --filter @gestao-pastoral/api lint
pnpm --filter @gestao-pastoral/shared typecheck
pnpm --filter @gestao-pastoral/api typecheck
```

---

## 7. Problemas conhecidos / troubleshooting

- **`nest start --watch` não sobe, erro `Cannot find module dist/main`**:
  causado pela combinação `deleteOutDir: true` (em `nest-cli.json`) +
  `incremental: true` (em `apps/api/tsconfig.json`) — o `nest-cli` apaga a
  pasta `dist` a cada start, mas o cache incremental do TypeScript
  (`tsconfig.build.tsbuildinfo`) não sabia disso e achava que os arquivos
  já estavam compilados, então não os regravava. **Corrigido** em
  2026-09-20 desativando `incremental` em `apps/api/tsconfig.json` (não
  trazia ganho real de performance aqui e causava esse bug toda vez que a
  API reiniciava após um crash). Se o erro voltar a aparecer por algum
  motivo, apague o cache manualmente e reinicie:
  ```bash
  rm apps/api/tsconfig.build.tsbuildinfo
  pnpm --filter @gestao-pastoral/api dev
  ```
- **`prisma migrate dev` falha com "Added the required column
  organizationId to the role_permissions table ... There are N rows in
  this table, it is not possible to execute this step"**: aconteceu ao
  migrar `role_permissions` para ser por organização (2026-09-20). Se você
  já tinha o banco local rodando antes dessa mudança, limpe só essa tabela
  antes de migrar (é seguro — ela é sempre repopulada pelo seed):
  ```bash
  docker exec gestao-pastoral-postgres psql -U postgres -d gestao_pastoral -c "TRUNCATE TABLE role_permissions;"
  pnpm --filter @gestao-pastoral/api prisma:migrate
  pnpm --filter @gestao-pastoral/api prisma:seed
  ```
- **Typecheck/lint falhando com erro sobre `@prisma/client`**: rode
  `pnpm --filter @gestao-pastoral/api prisma:generate` antes — o Prisma
  Client precisa existir antes do typecheck/lint (é por isso que o CI
  gera o client antes desses passos).
- **Login com `superadmin@...` mostra "Usuário sem organização
  associada"**: comportamento esperado nesta fase (ver seção 4 acima),
  não é bug. Use um dos outros perfis para ver o painel completo.
- **Docker Desktop não inicia / `docker info` falha**: abra o Docker
  Desktop manualmente e espere o status "Engine running" antes de rodar
  `docker compose up`.
- **`prisma generate` falha com `EPERM: operation not permitted, rename
  ...query_engine-windows.dll.node`** (Windows): o processo da API
  (`nest start --watch` / `dist\main`) está rodando e mantém o engine do
  Prisma travado em memória. Pare a API antes de gerar o client:
  ```powershell
  # feche a janela "API - Dizimo Conectado" (ou Ctrl+C nela), depois:
  pnpm --filter @gestao-pastoral/api prisma:generate
  ```
  Se mesmo assim persistir, verifique se não sobrou nenhum processo
  `node.exe` órfão de uma tentativa anterior (`nest.js start --watch` ou
  `apps\api\dist\main`) e encerre-o manualmente:
  ```powershell
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Select-Object ProcessId, CommandLine
  Stop-Process -Id <PID> -Force
  ```
