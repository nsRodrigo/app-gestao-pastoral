import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditRecordInput {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

/**
 * Registro de auditoria append-only (seções 29 e 30). Não existe método de
 * update/delete propositalmente: nenhum usuário comum pode apagar logs.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        previousValue: input.previousValue as never,
        newValue: input.newValue as never,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async listForOrganization(organizationId: string, take = 50, skip = 0) {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }
}
