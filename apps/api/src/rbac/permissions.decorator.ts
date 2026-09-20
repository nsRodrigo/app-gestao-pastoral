import { SetMetadata } from "@nestjs/common";
import { Permission } from "@gestao-pastoral/shared";

export const PERMISSIONS_KEY = "permissions";

/**
 * Exige que o usuário autenticado possua TODAS as permissões informadas.
 * SUPER_ADMIN sempre passa (ver PermissionsGuard).
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
