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
`contribution.create`, `member.financial.read`) — `RolePermission` (padrão por
perfil) — `UserRole` (atribuição do usuário a um perfil **dentro de uma
organização**, permitindo que o mesmo usuário tenha perfis diferentes em
organizações diferentes, futuramente).

Perfis seed (fixos, correspondem à seção 3): `SUPER_ADMIN`, `PAROCO`,
`TESOUREIRO`, `SECRETARIA`, `COORDENADOR_DIZIMO`, `APOIADOR`, `DIZIMISTA`.

Permissões sensíveis (ex.: ver valor financeiro individual) são
configuráveis por organização via flags em `OrganizationSettings`
(ex.: `paroco_pode_ver_valores_individuais`), conforme seção 3 ("acesso a
valores individuais deve ser configurável").

## 5. Dinheiro

Todo valor monetário é armazenado como **inteiro em centavos**
(`amountCents: Int`), nunca `float`. Conversão para exibição (R$) ocorre
somente na camada de apresentação.

## 6. Auditoria

Toda operação sensível (alteração de contribuição, permissão, exclusão
lógica etc.) grava `AuditLog` com usuário, ação, entidade, valores
anterior/novo, IP e timestamp. `AuditLog` é append-only: não há endpoint de
update/delete para usuários comuns (seção 29/30).

## 7. Fases de implementação

Seguindo a seção 55 do prompt mestre, este projeto será implementado em
fases incrementais, cada uma com testes e DoD (seção 54) antes de avançar:

1. **Fundação** (em andamento): arquitetura, banco, autenticação, RBAC,
   organizações, famílias, dizimistas.
2. Financeiro: contribuições, métodos, QR Code, recibos, dashboard.
3. Pagamentos: Pix, cartão, webhooks, recorrência, conciliação.
4. Pastoral: cuidado pastoral, oração, espiritualidade, aniversários,
   comunicação, eventos.
5. Transparência: receitas, despesas, categorias, prestação de contas,
   relatórios.
6. Qualidade: testes, cobertura, segurança, auditoria, performance.
7. Deploy: CI/CD, homologação, produção, monitoramento, backup.
