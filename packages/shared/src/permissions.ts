import { RoleName } from "./roles";

/**
 * Catálogo de permissões granulares. Cresce por fase — nesta fase
 * (Fundação) cobrimos apenas organizações, usuários/papéis, famílias,
 * dizimistas e auditoria. Permissões de contribuições/pagamentos entram na
 * Fase 2/3.
 */
export const Permission = {
  ORGANIZATION_MANAGE: "organization:manage",
  USER_MANAGE: "user:manage",
  ROLE_ASSIGN: "role:assign",
  MEMBER_CREATE: "member:create",
  MEMBER_READ: "member:read",
  MEMBER_UPDATE: "member:update",
  MEMBER_ARCHIVE: "member:archive",
  MEMBER_FINANCIAL_READ: "member:financial:read",
  FAMILY_CREATE: "family:create",
  FAMILY_READ: "family:read",
  FAMILY_UPDATE: "family:update",
  AUDIT_READ: "audit:read",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

/**
 * Matriz padrão perfil -> permissões (seção 3). Usada pelo seed para
 * popular RolePermission. Organizações podem, no futuro, customizar
 * (ex.: liberar MEMBER_FINANCIAL_READ para SECRETARIA), mas o padrão
 * segue estritamente o prompt mestre.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SUPER_ADMIN]: ALL_PERMISSIONS,
  [RoleName.PAROCO]: [
    Permission.MEMBER_READ,
    Permission.FAMILY_READ,
    Permission.AUDIT_READ,
    // Acesso a valores individuais é configurável por organização
    // (OrganizationSettings.parocoPodeVerValoresIndividuais) — ver
    // OrganizationScopeGuard / MembersService.
  ],
  [RoleName.TESOUREIRO]: [
    Permission.MEMBER_READ,
    Permission.MEMBER_FINANCIAL_READ,
    Permission.FAMILY_READ,
  ],
  [RoleName.SECRETARIA]: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_ARCHIVE,
    Permission.FAMILY_CREATE,
    Permission.FAMILY_READ,
    Permission.FAMILY_UPDATE,
    // Sem MEMBER_FINANCIAL_READ por padrão (seção 3: "não deve visualizar
    // valores financeiros individuais salvo autorização explícita").
  ],
  [RoleName.COORDENADOR_DIZIMO]: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
    Permission.MEMBER_UPDATE,
    Permission.MEMBER_ARCHIVE,
    Permission.MEMBER_FINANCIAL_READ,
    Permission.FAMILY_READ,
  ],
  [RoleName.APOIADOR]: [
    Permission.MEMBER_CREATE,
    Permission.MEMBER_READ,
  ],
  [RoleName.DIZIMISTA]: [],
};
