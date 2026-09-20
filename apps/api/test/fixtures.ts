import * as argon2 from "argon2";
import { ALL_PERMISSIONS, Permission, RoleName } from "@gestao-pastoral/shared";
import { PrismaService } from "../src/prisma/prisma.service";
import { generateQrCodeToken } from "../src/members/qrcode-token.util";
import { seedDefaultRolePermissions } from "../src/organizations/seed-role-permissions.util";

export const TEST_PASSWORD = "SenhaForte123";

let roleIdsCache: Record<RoleName, string> | null = null;
let permissionIdsCache: Record<Permission, string> | null = null;

/** Garante que o catálogo global de papéis/permissões existe (idempotente). */
export async function ensureRolesAndPermissions(prisma: PrismaService): Promise<{
  roleIds: Record<RoleName, string>;
  permissionIds: Record<Permission, string>;
}> {
  if (roleIdsCache && permissionIdsCache) {
    return { roleIds: roleIdsCache, permissionIds: permissionIdsCache };
  }

  const permissionIds: Record<Permission, string> = {} as never;
  for (const key of ALL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { key },
      create: { key },
      update: {},
    });
    permissionIds[key] = permission.id;
  }

  const roleIds: Record<RoleName, string> = {} as never;
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    });
    roleIds[roleName] = role.id;
  }

  roleIdsCache = roleIds;
  permissionIdsCache = permissionIds;
  return { roleIds, permissionIds };
}

/** Remove todos os dados de tenants entre testes, preservando o catálogo global de papéis/permissões. */
export async function cleanTenantData(prisma: PrismaService): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.member.deleteMany();
  await prisma.family.deleteMany();
  await prisma.community.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.organization.deleteMany();
}

export interface TestOrgUser {
  userId: string;
  email: string;
  organizationId: string;
  role: RoleName;
}

let seq = 0;
function unique(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export async function createOrganizationWithUser(
  prisma: PrismaService,
  role: RoleName,
  opts: { orgName?: string; parocoPodeVerValoresIndividuais?: boolean } = {},
): Promise<TestOrgUser> {
  const { roleIds, permissionIds } = await ensureRolesAndPermissions(prisma);

  const org = await prisma.organization.create({
    data: {
      name: opts.orgName ?? `Paróquia ${unique("org")}`,
      slug: unique("org"),
      settings: {
        create: {
          parocoPodeVerValoresIndividuais:
            opts.parocoPodeVerValoresIndividuais ?? false,
        },
      },
    },
  });

  // Espelha o que OrganizationsService.create/prisma seed fazem: cada
  // organização recebe sua própria cópia dos defaults de permissão por papel.
  await seedDefaultRolePermissions(prisma, org.id, roleIds, permissionIds);

  const passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
  });
  const email = `${unique("user")}@example.com`;

  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: `Usuário ${role}`,
      email,
      passwordHash,
    },
  });

  await prisma.userRole.create({
    data: { userId: user.id, organizationId: org.id, roleId: roleIds[role] },
  });

  return { userId: user.id, email, organizationId: org.id, role };
}

export async function createSuperAdmin(prisma: PrismaService): Promise<{
  userId: string;
  email: string;
}> {
  const passwordHash = await argon2.hash(TEST_PASSWORD, {
    type: argon2.argon2id,
  });
  const email = `${unique("superadmin")}@example.com`;
  const user = await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      passwordHash,
      organizationId: null,
      isSuperAdmin: true,
    },
  });
  return { userId: user.id, email };
}

export async function createFamily(
  prisma: PrismaService,
  organizationId: string,
  name = `Família ${unique("fam")}`,
) {
  return prisma.family.create({ data: { organizationId, name } });
}

export async function createMember(
  prisma: PrismaService,
  organizationId: string,
  overrides: Partial<{
    fullName: string;
    familyId: string;
    cpf: string;
    suggestedAmountCents: number;
  }> = {},
) {
  return prisma.member.create({
    data: {
      organizationId,
      fullName: overrides.fullName ?? `Dizimista ${unique("member")}`,
      familyId: overrides.familyId,
      cpf: overrides.cpf,
      suggestedAmountCents: overrides.suggestedAmountCents,
      termsAcceptedAt: new Date(),
      qrCodeToken: generateQrCodeToken(),
    },
  });
}
