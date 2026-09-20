import { Permission, PermissionResourceGroup } from "@gestao-pastoral/shared";

/**
 * Converte a matriz granular de permissões (Permission[]) em um seletor
 * simples de 2 ou 3 níveis por recurso (Nada/Ver/Ver e editar), conforme a
 * seção 3: cada organização escolhe o que cada perfil vê ou vê e edita.
 */
export type AccessLevel = "nada" | "ver" | "verEEditar";

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  nada: "Nada",
  ver: "Ver",
  verEEditar: "Ver e editar",
};

export function levelOptions(group: PermissionResourceGroup): AccessLevel[] {
  const options: AccessLevel[] = ["nada"];
  if (group.ver) options.push("ver");
  if (group.verEEditar) options.push("verEEditar");
  return options;
}

function hasAll(permissions: Permission[], required?: Permission[]): boolean {
  return !!required && required.every((p) => permissions.includes(p));
}

export function currentLevel(group: PermissionResourceGroup, permissions: Permission[]): AccessLevel {
  if (hasAll(permissions, group.verEEditar)) return "verEEditar";
  if (hasAll(permissions, group.ver)) return "ver";
  return "nada";
}

export function levelPermissions(group: PermissionResourceGroup, level: AccessLevel): Permission[] {
  if (level === "verEEditar") return group.verEEditar ?? group.ver ?? [];
  if (level === "ver") return group.ver ?? [];
  return [];
}
