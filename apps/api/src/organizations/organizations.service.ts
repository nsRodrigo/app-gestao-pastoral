import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateOrganizationInput,
  RoleName,
  UpdateOrganizationSettingsInput,
} from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/types";

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
}
