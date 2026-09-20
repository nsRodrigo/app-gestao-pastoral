import { Prisma, PrismaClient } from "@prisma/client";
import { DEFAULT_ROLE_PERMISSIONS, Permission, RoleName } from "@gestao-pastoral/shared";

/** Aceita tanto o client normal quanto um client de transação Prisma. */
export type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Popula `RolePermission` de uma organização com os defaults de
 * `DEFAULT_ROLE_PERMISSIONS` (seção 3). Usado tanto pelo seed (nova
 * organização de exemplo) quanto por `OrganizationsService.create`
 * (nova organização real) — mantém as duas trilhas sincronizadas.
 * SUPER_ADMIN nunca passa por aqui (bypass total, sem organização fixa).
 */
export async function seedDefaultRolePermissions(
  db: PrismaClientOrTx,
  organizationId: string,
  roleIdsByName: Record<RoleName, string>,
  permissionIdsByKey: Record<Permission, string>,
): Promise<void> {
  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    if (roleName === RoleName.SUPER_ADMIN) continue;

    const roleId = roleIdsByName[roleName as RoleName];
    for (const key of permissionKeys) {
      const permissionId = permissionIdsByKey[key];
      await db.rolePermission.upsert({
        where: {
          organizationId_roleId_permissionId: { organizationId, roleId, permissionId },
        },
        create: { organizationId, roleId, permissionId },
        update: {},
      });
    }
  }
}
