import { Permission } from "./permissions";

/**
 * Agrupamento das permissões granulares por recurso, para a tela de
 * "Perfis e Permissões" (seção 3: cada organização customiza o que cada
 * papel pode ver ou ver e editar). Fonte única de verdade compartilhada
 * entre a validação da API e a UI do painel web — evita duplicar rótulos e
 * regras de agrupamento em dois lugares.
 *
 * Grupos sem `ver` (só `verEEditar`) ou sem `verEEditar` (só `ver`) viram um
 * seletor de 2 níveis na UI; os que têm os dois viram 3 níveis
 * (Nada/Ver/Ver e Editar). `Permission.ORGANIZATION_MANAGE` é ação de
 * plataforma e nunca aparece aqui (ver `NON_ASSIGNABLE_PERMISSIONS` em
 * schemas/organization.ts).
 */
export interface PermissionResourceGroup {
  key: string;
  label: string;
  /** Permissões concedidas na opção "Ver". */
  ver?: Permission[];
  /** Permissões concedidas na opção "Ver e Editar" (já inclui as de "Ver"). */
  verEEditar?: Permission[];
}

export const PERMISSION_RESOURCE_GROUPS: PermissionResourceGroup[] = [
  {
    key: "members",
    label: "Dizimistas",
    ver: [Permission.MEMBER_READ],
    verEEditar: [
      Permission.MEMBER_READ,
      Permission.MEMBER_CREATE,
      Permission.MEMBER_UPDATE,
      Permission.MEMBER_ARCHIVE,
    ],
  },
  {
    key: "membersFinancial",
    label: "Valores financeiros dos dizimistas",
    ver: [Permission.MEMBER_FINANCIAL_READ],
  },
  {
    key: "families",
    label: "Famílias",
    ver: [Permission.FAMILY_READ],
    verEEditar: [Permission.FAMILY_READ, Permission.FAMILY_CREATE, Permission.FAMILY_UPDATE],
  },
  {
    key: "users",
    label: "Usuários da equipe",
    verEEditar: [Permission.USER_MANAGE],
  },
  {
    key: "roleAssignment",
    label: "Atribuição de papéis",
    verEEditar: [Permission.ROLE_ASSIGN],
  },
  {
    key: "audit",
    label: "Auditoria",
    ver: [Permission.AUDIT_READ],
  },
];
