import { Permission } from "@gestao-pastoral/shared";

export interface NavItem {
  href: string;
  label: string;
  /** Quando ausente, o item aparece para qualquer usuário autenticado. */
  permission?: Permission;
}

/**
 * Ordem da seção 37 do prompt mestre. Só entram aqui os módulos já
 * implementados na Fase 1 — os demais chegam nas próximas fases e não
 * devem aparecer como links "mortos" (seção 57: nunca entregar telas
 * falsas ou botões sem funcionamento).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/dizimistas", label: "Dizimistas", permission: Permission.MEMBER_READ },
  { href: "/dashboard/familias", label: "Famílias", permission: Permission.FAMILY_READ },
  { href: "/dashboard/usuarios", label: "Usuários", permission: Permission.USER_MANAGE },
  { href: "/dashboard/auditoria", label: "Auditoria", permission: Permission.AUDIT_READ },
];
