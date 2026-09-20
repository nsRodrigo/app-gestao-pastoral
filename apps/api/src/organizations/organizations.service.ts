import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateOrganizationInput,
  CUSTOMIZABLE_ROLES,
  Permission,
  RoleName,
  UpdateOrganizationSettingsInput,
  UpdateRolePermissionsInput,
} from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/types";
import { seedDefaultRolePermissions } from "./seed-role-permissions.util";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Cria uma organização (paróquia/igreja) junto de seu primeiro usuário,
   * que recebe o papel PAROCO. Somente o SUPER_ADMIN da plataforma pode
   * criar organizações (seção 3); atribuir os demais papéis (Tesoureiro,
   * Secretaria etc.) é feito depois, via UsersModule.
   */
  async create(dto: CreateOrganizationInput, actor: AuthenticatedUser) {
    const slug = dto.slug ?? slugify(dto.name);

    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException("Já existe uma organização com esse identificador.");
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.admin.email },
    });
    if (existingEmail) {
      throw new ConflictException("Já existe um usuário com esse e-mail.");
    }

    const paroco = await this.prisma.role.findUniqueOrThrow({
      where: { name: RoleName.PAROCO },
    });

    const allRoles = await this.prisma.role.findMany();
    const roleIdsByName = Object.fromEntries(
      allRoles.map((role) => [role.name, role.id]),
    ) as Record<RoleName, string>;

    const allPermissions = await this.prisma.permission.findMany();
    const permissionIdsByKey = Object.fromEntries(
      allPermissions.map((permission) => [permission.key, permission.id]),
    ) as Record<Permission, string>;

    const passwordHash = await this.passwords.hash(dto.admin.password);

    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          address: dto.address,
          phone: dto.phone,
          email: dto.email,
          settings: { create: {} },
        },
      });

      const adminUser = await tx.user.create({
        data: {
          organizationId: org.id,
          name: dto.admin.name,
          email: dto.admin.email,
          passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          organizationId: org.id,
          roleId: paroco.id,
        },
      });

      await seedDefaultRolePermissions(tx, org.id, roleIdsByName, permissionIdsByKey);

      return org;
    });

    await this.audit.record({
      organizationId: organization.id,
      userId: actor.userId,
      action: "organization.create",
      entityType: "Organization",
      entityId: organization.id,
      newValue: { name: organization.name, slug: organization.slug },
    });

    return organization;
  }

  async findById(id: string, actor: AuthenticatedUser) {
    if (actor.role !== RoleName.SUPER_ADMIN && actor.organizationId !== id) {
      throw new ForbiddenException("Você não tem acesso a esta organização.");
    }

    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException("Organização não encontrada.");
    return org;
  }

  async updateSettings(
    id: string,
    dto: UpdateOrganizationSettingsInput,
    actor: AuthenticatedUser,
  ) {
    await this.findById(id, actor); // valida existência + escopo de tenant

    const before = await this.prisma.organizationSettings.findUnique({
      where: { organizationId: id },
    });

    const updated = await this.prisma.organizationSettings.update({
      where: { organizationId: id },
      data: dto,
    });

    await this.audit.record({
      organizationId: id,
      userId: actor.userId,
      action: "organization.settings.update",
      entityType: "OrganizationSettings",
      entityId: updated.id,
      previousValue: before,
      newValue: updated,
    });

    return updated;
  }

  /** Lista organizações — só o Super Admin usa (seletor de organização na tela de permissões). */
  async listAll(actor: AuthenticatedUser) {
    if (actor.role !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException("Apenas o Super Administrador pode listar organizações.");
    }
    return this.prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Matriz atual de permissões por papel customizável (seção 3). Só
   * Pároco (da própria organização) ou Super Admin podem consultar.
   */
  async getRolePermissions(id: string, actor: AuthenticatedUser) {
    await this.findById(id, actor); // valida existência + escopo de tenant
    this.requireRolePermissionsManager(actor);

    const rows = await this.prisma.rolePermission.findMany({
      where: { organizationId: id },
      include: { role: true, permission: true },
    });

    return CUSTOMIZABLE_ROLES.map((role) => ({
      role,
      permissions: rows
        .filter((row) => row.role.name === role)
        .map((row) => row.permission.key as Permission),
    }));
  }

  /** Substitui, por papel, a lista de permissões da organização. */
  async updateRolePermissions(
    id: string,
    dto: UpdateRolePermissionsInput,
    actor: AuthenticatedUser,
  ) {
    await this.findById(id, actor);
    this.requireRolePermissionsManager(actor);

    const before = await this.getRolePermissions(id, actor);

    const roles = await this.prisma.role.findMany({
      where: { name: { in: [...CUSTOMIZABLE_ROLES] } },
    });
    const roleIdByName = Object.fromEntries(
      roles.map((role) => [role.name, role.id]),
    ) as Record<RoleName, string>;

    const permissions = await this.prisma.permission.findMany();
    const permissionIdByKey = Object.fromEntries(
      permissions.map((permission) => [permission.key, permission.id]),
    ) as Record<Permission, string>;

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.roles) {
        const roleId = roleIdByName[entry.role];
        await tx.rolePermission.deleteMany({ where: { organizationId: id, roleId } });
        for (const key of entry.permissions) {
          await tx.rolePermission.create({
            data: { organizationId: id, roleId, permissionId: permissionIdByKey[key] },
          });
        }
      }
    });

    const after = await this.getRolePermissions(id, actor);

    await this.audit.record({
      organizationId: id,
      userId: actor.userId,
      action: "organization.rolePermissions.update",
      entityType: "RolePermission",
      previousValue: before,
      newValue: after,
    });

    return after;
  }

  private requireRolePermissionsManager(actor: AuthenticatedUser): void {
    if (actor.role !== RoleName.SUPER_ADMIN && actor.role !== RoleName.PAROCO) {
      throw new ForbiddenException(
        "Apenas o Pároco ou o Super Administrador podem gerenciar permissões.",
      );
    }
  }
}
