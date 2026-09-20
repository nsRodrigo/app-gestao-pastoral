import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateStaffUserInput,
  RoleName,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/types";

function toSafeUser(user: { id: string; name: string; email: string; isActive: boolean; phone: string | null }) {
  return user;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /** Resolve a organização-alvo: parâmetro explícito (só SUPER_ADMIN) ou a própria do ator. */
  private resolveTargetOrgId(actor: AuthenticatedUser, requested?: string): string {
    if (actor.role === RoleName.SUPER_ADMIN) {
      if (!requested) {
        throw new BadRequestException(
          "organizationId é obrigatório para o Super Administrador.",
        );
      }
      return requested;
    }
    if (!actor.organizationId) {
      throw new ForbiddenException("Usuário sem organização associada.");
    }
    return actor.organizationId;
  }

  async createStaffUser(dto: CreateStaffUserInput, actor: AuthenticatedUser) {
    const organizationId = this.resolveTargetOrgId(actor, dto.organizationId);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Já existe um usuário com esse e-mail.");
    }

    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) throw new NotFoundException("Papel inválido.");

    const passwordHash = await this.passwords.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
        },
      });
      await tx.userRole.create({
        data: { userId: created.id, organizationId, roleId: role.id },
      });
      return created;
    });

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      newValue: { name: user.name, email: user.email, role: dto.role },
    });

    return toSafeUser(user);
  }

  async listForOrganization(actor: AuthenticatedUser, requestedOrgId?: string) {
    const organizationId = this.resolveTargetOrgId(actor, requestedOrgId);

    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: {
        userRoles: { where: { organizationId }, include: { role: true } },
      },
      orderBy: { name: "asc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isActive: u.isActive,
      role: u.userRoles[0]?.role.name ?? null,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  private async assertSameOrgOrSuperAdmin(actor: AuthenticatedUser, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException("Usuário não encontrado.");
    if (
      actor.role !== RoleName.SUPER_ADMIN &&
      target.organizationId !== actor.organizationId
    ) {
      throw new ForbiddenException("Você não tem acesso a este usuário.");
    }
    return target;
  }

  async updateRole(userId: string, dto: UpdateUserRoleInput, actor: AuthenticatedUser) {
    const target = await this.assertSameOrgOrSuperAdmin(actor, userId);
    if (!target.organizationId) {
      throw new BadRequestException("Não é possível atribuir papel a este usuário.");
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });

    const before = await this.prisma.userRole.findUnique({
      where: { userId_organizationId: { userId, organizationId: target.organizationId } },
      include: { role: true },
    });

    const updated = await this.prisma.userRole.upsert({
      where: {
        userId_organizationId: { userId, organizationId: target.organizationId },
      },
      create: { userId, organizationId: target.organizationId, roleId: role.id },
      update: { roleId: role.id },
      include: { role: true },
    });

    await this.audit.record({
      organizationId: target.organizationId,
      userId: actor.userId,
      action: "user.role.update",
      entityType: "User",
      entityId: userId,
      previousValue: before ? { role: before.role.name } : null,
      newValue: { role: updated.role.name },
    });

    return { userId, role: updated.role.name };
  }

  async updateStatus(userId: string, dto: UpdateUserStatusInput, actor: AuthenticatedUser) {
    const target = await this.assertSameOrgOrSuperAdmin(actor, userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: dto.isActive },
    });

    await this.audit.record({
      organizationId: target.organizationId,
      userId: actor.userId,
      action: dto.isActive ? "user.activate" : "user.deactivate",
      entityType: "User",
      entityId: userId,
      previousValue: { isActive: target.isActive },
      newValue: { isActive: updated.isActive },
    });

    return toSafeUser(updated);
  }
}
