# Arquitetura — Dízimo Conectado

Este documento registra as decisões arquiteturais do projeto, conforme a regra
"não alterar/inventar decisão de negócio ou arquitetura silenciosamente":
toda decisão relevante é explicada aqui com as opções consideradas e o motivo
da escolha.

## 1. Visão geral

Monorepo com três frentes:

```
apps/
  api/    -> Backend NestJS (TypeScript) — API REST + regras de negócio
  web/    -> Next.js (TypeScript) — Painel administrativo + PWA do
             dizimista/apoiador (mobile-first, responsivo)
packages/
  shared/ -> Tipos, enums, schemas (zod) e constantes compartilhadas
             entre api e web (perfis, permissões, status de contribuição etc.)
```

O aplicativo mobile nativo (React Native/Expo) fica planejado para a Fase 3+,
reaproveitando 100% da API. Decisão tomada com o usuário: priorizar entrega
rápida de valor via PWA de altíssima qualidade mobile antes de duplicar
esforço em apps nativos.

## 2. Stack técnica (decisão confirmada com o usuário)

| Camada          | Escolha                          | Motivo |
|-----------------|-----------------------------------|--------|
| Backend         | NestJS + TypeScript               | Arquitetura modular (módulos/serviços/controllers) alinhada a "separar apresentação, domínio, serviços, persistência", DI nativa facilita testes com mocks/stubs, guards/interceptors prontos para RBAC e auditoria. |
| Banco de dados  | PostgreSQL                        | Suporte a tipos monetários precisos (`numeric`/inteiro em centavos), transações ACID essenciais para idempotência de pagamentos, JSON quando necessário. |
| ORM             | Prisma                            | Migrations versionadas, type-safety ponta a ponta, bom suporte a testes com banco de teste isolado. |
| Frontend web    | Next.js (App Router) + TypeScript | SSR/PWA, roteamento por perfil, excelente experiência mobile responsiva (seção 41). |
| Autenticação    | JWT (access + refresh) + Argon2   | Padrão seguro, sem estado no access token, refresh revogável no banco. |
| Pagamentos      | Camada abstrata `PaymentProvider` (porta/adaptador) com `MockPaymentProvider` para dev/testes | Gateway real (Mercado Pago/Asaas/Pagar.me) ainda não escolhido pelo usuário; a interface permite plugar o gateway real sem alterar regra de negócio. |
| Testes          | Jest (unit + integração) + Supertest; Playwright reservado para E2E futuro | Alinhado à seção 53 do prompt mestre (testes desde o início). |
| CI              | GitHub Actions                    | Lint + testes + build a cada PR (seção 53.21). |

## 3. Multi-tenancy (seção 45)

Estratégia: **multi-tenant lógico com `organizationId` em todas as tabelas
relevantes** (não schema-per-tenant), com:

- `organizationId` obrigatório em toda query de domínio;
- Guard global (`OrganizationScopeGuard`) que injeta a organização do usuário
  autenticado no contexto da requisição;
- Testes de isolamento (IDOR) obrigatórios para cada endpoint sensível
  (seção 53.10) garantindo que usuário da Igreja A nunca acesse dados da
  Igreja B.

Motivo da escolha: schema-per-tenant ou banco-per-tenant adiciona complexidade
operacional (migrations por tenant, pool de conexões) desproporcional ao
estágio atual do produto. A abordagem lógica é mais simples de auditar e
escalar horizontalmente mais tarde (particionamento por `organizationId` se
necessário).

## 4. RBAC (seção 3)

Modelo: `Role` (perfil) — `Permission` (ação granular, ex.:
`contribution.create`, `member.financial.read`) — `RolePermission`
(atribuição de permissões a um perfil **dentro de uma organização**) —
`UserRole` (atribuição do usuário a um perfil **dentro de uma
organização**, permitindo que o mesmo usuário tenha perfis diferentes em
organizações diferentes, futuramente).

Perfis seed (fixos, correspondem à seção 3): `SUPER_ADMIN`, `PAROCO`,
`TESOUREIRO`, `SECRETARIA`, `COORDENADOR_DIZIMO`, `APOIADOR`, `DIZIMISTA`.
`Role` e `Permission` são catálogos globais (compartilhados por todas as
organizações); só a atribuição em `RolePermission` é por organização.

**SUPER_ADMIN é representado por um flag, não por `UserRole`.** Como
`UserRole` é sempre escopado a uma organização (`organizationId` não
nulo) e o Super Administrador é um usuário de plataforma sem organização
fixa, ele é identificado por `User.isSuperAdmin: Boolean`. O
`AuthService.buildJwtPayload` verifica esse flag antes de consultar
`userRoles`; quando verdadeiro, o JWT recebe `role: SUPER_ADMIN` e todas
as permissões, independentemente de qualquer `UserRole` cadastrado.

### 4.1 Permissões customizáveis por organização

Decisão (2026-09-20, a pedido do usuário): cada organização pode
liberar/travar, por perfil, o que ele vê ou vê e edita — ex.: uma paróquia
pode dar ao Apoiador acesso a valores recebidos, ou à Secretaria acesso a
valores que por padrão só o Tesoureiro vê. Antes, `RolePermission` era uma
matriz **global e fixa**, seedada uma única vez a partir de
`DEFAULT_ROLE_PERMISSIONS` (`packages/shared/src/permissions.ts`).

- `RolePermission` agora tem `organizationId` (chave composta
  `organizationId+roleId+permissionId`). Cada organização recebe sua
  própria cópia dos defaults na criação (`seedDefaultRolePermissions`,
  usado tanto por `OrganizationsService.create` quanto por
  `prisma/seed.ts`).
- **Perfis fixos (não entram na matriz customizável):** `SUPER_ADMIN`
  (bypass total, nunca usa `RolePermission`), `PAROCO` (evita
  autoexclusão acidental — ele é quem gerencia esta tela) e `DIZIMISTA`
  (sem permissões administrativas, acessa só a própria área). Somente
  `TESOUREIRO`, `SECRETARIA`, `COORDENADOR_DIZIMO` e `APOIADOR`
  (`CUSTOMIZABLE_ROLES` em `packages/shared/src/schemas/organization.ts`)
  são customizáveis.
- **Quem edita:** o Pároco da própria organização, ou o Super Admin (de
  qualquer organização) — checagem por **papel**, não por uma nova
  `Permission` dedicada (`OrganizationsService.requireRolePermissionsManager`),
  para não precisar excluir essa própria permissão da matriz que ela
  controlaria.
- `Permission.ORGANIZATION_MANAGE` nunca aparece na matriz — é ação de
  plataforma (criar organizações), não delegável a um perfil de paróquia.
- UI (`apps/web/.../dashboard/permissoes`): as permissões granulares são
  agrupadas por recurso em `PERMISSION_RESOURCE_GROUPS`
  (`packages/shared/src/permission-groups.ts`) e expostas como um
  seletor de 2 ou 3 níveis (Nada/Ver/Ver e editar) por perfil — mais
  simples para quem não é técnico do que uma lista crua de permissões.
- Como as permissões vêm do JWT (ver `PermissionsGuard`,
  `apps/api/src/rbac/permissions.guard.ts`), uma mudança na matriz só
  reflete para o usuário afetado no próximo `POST /auth/refresh` (mesmo
  comportamento de uma troca de papel — `AuthService.buildJwtPayload` é
  recalculado a cada refresh, dentro do prazo de 15 min do access token).

Outras permissões sensíveis (ex.: Pároco ver valor financeiro individual)
continuam configuráveis via flags dedicadas em `OrganizationSettings`
(ex.: `parocoPodeVerValoresIndividuais`), quando a checagem precisa ser
em tempo real e não pode esperar o próximo refresh do token (ver
`MembersService.canViewFinancial`, que faz leitura direta no banco).

## 5. Dinheiro

Todo valor monetário é armazenado como **inteiro em centavos**
(`amountCents: Int`), nunca `float`. Conversão para exibição (R$) ocorre
somente na camada de apresentação.

## 6. Auditoria

Toda operação sensível (alteração de contribuição, permissão, exclusão
lógica etc.) grava `AuditLog` com usuário, ação, entidade, valores
anterior/novo, IP e timestamp. `AuditLog` é append-only: não há endpoint de
update/delete para usuários comuns (seção 29/30).

## 7. Painel Web (apps/web)

- **Next.js 15 (App Router) + React 19**: escolhido especificamente pelas
  Server Actions com `useActionState`/`useFormStatus` estáveis, que
  eliminam a necessidade de uma camada de API própria no frontend para
  mutações simples (criar família, cadastro rápido de dizimista etc.).
- **Sessão via cookies httpOnly** (`access_token`, `refresh_token`,
  `session`), nunca expostos a `localStorage`/JS do cliente — mitiga
  roubo de token via XSS (seção 32/LGPD). O papel e as permissões do
  usuário são lidos no servidor decodificando o payload do JWT (sem
  verificar assinatura, pois a validação real é sempre feita pela API);
  a UI usa isso apenas para decidir o que renderizar, nunca como fonte de
  autorização — cada endpoint da API reaplica o `PermissionsGuard`.
- **Renovação de sessão**: nesta fase, um 401 da API durante uma
  Server Component/Action redireciona para `/login` (sessão expira em até
  15 min de inatividade). Refresh silencioso automático fica para uma
  iteração futura.
- **Navegação condicionada por permissão**: a barra lateral (seção 37)
  só lista os módulos que o usuário pode acessar E que já existem nesta
  fase — nunca um link "morto" (seção 57).

## 8. Fases de implementação

Seguindo a seção 55 do prompt mestre, este projeto será implementado em
fases incrementais, cada uma com testes e DoD (seção 54) antes de avançar:

1. **Fundação** (concluída nesta entrega): arquitetura, banco, autenticação,
   RBAC, organizações, famílias, dizimistas, painel web e CI.
2. Financeiro: contribuições, métodos, QR Code, recibos, dashboard.
3. Pagamentos: Pix, cartão, webhooks, recorrência, conciliação.
4. Pastoral: cuidado pastoral, oração, espiritualidade, aniversários,
   comunicação, eventos.
5. Transparência: receitas, despesas, categorias, prestação de contas,
   relatórios.
6. Qualidade: testes, cobertura, segurança, auditoria, performance.
7. Deploy: CI/CD, homologação, produção, monitoramento, backup.
