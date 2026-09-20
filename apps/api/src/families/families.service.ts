import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateFamilyInput, UpdateFamilyInput } from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/types";

@Injectable()
export class FamiliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private requireOrg(actor: AuthenticatedUser): string {
    if (!actor.organizationId) {
      throw new ForbiddenException("Usuário sem organização associada.");
    }
    return actor.organizationId;
  }

  async create(dto: CreateFamilyInput, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const family = await this.prisma.family.create({
      data: { organizationId, ...dto },
    });

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "family.create",
      entityType: "Family",
      entityId: family.id,
      newValue: { name: family.name },
    });

    return family;
  }

  async list(actor: AuthenticatedUser, search?: string) {
    const organizationId = this.requireOrg(actor);

    return this.prisma.family.findMany({
      where: {
        organizationId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true } } },
    });
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const family = await this.prisma.family.findFirst({
      where: { id, organizationId },
      include: { members: true },
    });
    if (!family) throw new NotFoundException("Família não encontrada.");
    return family;
  }

  async update(id: string, dto: UpdateFamilyInput, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const before = await this.prisma.family.findFirst({
      where: { id, organizationId },
    });
    if (!before) throw new NotFoundException("Família não encontrada.");

    const updated = await this.prisma.family.update({
      where: { id },
      data: dto,
    });

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "family.update",
      entityType: "Family",
      entityId: id,
      previousValue: before,
      newValue: updated,
    });

    return updated;
  }
}
