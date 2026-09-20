import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  CreateMemberInput,
  Permission,
  QuickRegisterMemberInput,
  RoleName,
  UpdateMemberInput,
} from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/types";
import { generateQrCodeToken } from "./qrcode-token.util";

const FINANCIAL_FIELDS = [
  "suggestedAmountCents",
  "contributionFrequency",
  "contributionPreference",
] as const;

type MemberRecord = Record<string, unknown>;

@Injectable()
export class MembersService {
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

  private async canViewFinancial(actor: AuthenticatedUser): Promise<boolean> {
    if (actor.permissions.includes(Permission.MEMBER_FINANCIAL_READ)) {
      return true;
    }
    if (actor.role === RoleName.PAROCO && actor.organizationId) {
      const settings = await this.prisma.organizationSettings.findUnique({
        where: { organizationId: actor.organizationId },
      });
      return settings?.parocoPodeVerValoresIndividuais ?? false;
    }
    return false;
  }

  /** Remove campos financeiros sensíveis quando o ator não tem autorização (seção 3). */
  private sanitize<T extends MemberRecord>(member: T, canView: boolean): T {
    if (canView) return member;
    const clone: MemberRecord = { ...member };
    for (const field of FINANCIAL_FIELDS) {
      delete clone[field];
    }
    return clone as T;
  }

  private async createWithUniqueToken(
    build: (token: string) => Prisma.MemberCreateArgs["data"],
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateQrCodeToken();
      try {
        return await this.prisma.member.create({ data: build(token) });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          const target = (err.meta?.target as string[] | undefined) ?? [];
          if (target.includes("qrCodeToken")) {
            lastError = err;
            continue; // colisão extremamente rara: tenta novo token
          }
          if (target.includes("cpf")) {
            throw new ConflictException("Já existe um dizimista com esse CPF nesta organização.");
          }
        }
        throw err;
      }
    }
    throw lastError;
  }

  async create(dto: CreateMemberInput, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const member = await this.createWithUniqueToken((qrCodeToken) => ({
      organizationId,
      familyId: dto.familyId,
      fullName: dto.fullName,
      socialName: dto.socialName,
      cpf: dto.cpf,
      birthDate: dto.birthDate,
      sex: dto.sex,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      email: dto.email,
      addressStreet: dto.addressStreet,
      addressNumber: dto.addressNumber,
      addressComplement: dto.addressComplement,
      addressNeighborhood: dto.addressNeighborhood,
      addressCity: dto.addressCity,
      addressState: dto.addressState,
      addressZipCode: dto.addressZipCode,
      communityId: dto.communityId,
      pastoral: dto.pastoral,
      ministry: dto.ministry,
      group: dto.group,
      entryDate: dto.entryDate,
      baptismDate: dto.baptismDate,
      pastoralNotes: dto.pastoralNotes,
      status: dto.status,
      contributionFrequency: dto.contributionFrequency,
      suggestedAmountCents: dto.suggestedAmountCents,
      contributionPreference: dto.contributionPreference,
      termsAcceptedAt: dto.termsAccepted ? new Date() : null,
      communicationConsent: dto.communicationConsent,
      qrCodeToken,
    }));

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "member.create",
      entityType: "Member",
      entityId: member.id,
      newValue: { fullName: member.fullName },
    });

    return member;
  }

  /** Cadastro rápido (seção 12) — usado pelo botão "Novo Dizimista" e pelo app do Apoiador. */
  async quickRegister(dto: QuickRegisterMemberInput, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    let familyId = dto.familyId;
    if (!familyId && dto.familyName) {
      const family = await this.prisma.family.create({
        data: { organizationId, name: dto.familyName },
      });
      familyId = family.id;
    }

    const member = await this.createWithUniqueToken((qrCodeToken) => ({
      organizationId,
      familyId,
      fullName: dto.fullName,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      email: dto.email,
      birthDate: dto.birthDate,
      termsAcceptedAt: new Date(),
      communicationConsent: dto.communicationConsent,
      qrCodeToken,
    }));

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "member.quick_create",
      entityType: "Member",
      entityId: member.id,
      newValue: { fullName: member.fullName },
    });

    return member;
  }

  async list(actor: AuthenticatedUser, search?: string) {
    const organizationId = this.requireOrg(actor);
    const canView = await this.canViewFinancial(actor);

    const members = await this.prisma.member.findMany({
      where: {
        organizationId,
        archivedAt: null,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search.replace(/\D/g, "") } },
                { phone: { contains: search } },
                { email: { contains: search, mode: "insensitive" } },
                { qrCodeToken: { contains: search.toUpperCase() } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: "asc" },
    });

    return members.map((m) => this.sanitize(m, canView));
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);
    const canView = await this.canViewFinancial(actor);

    const member = await this.prisma.member.findFirst({
      where: { id, organizationId },
      include: { family: true, community: true },
    });
    if (!member) throw new NotFoundException("Dizimista não encontrado.");

    return this.sanitize(member, canView);
  }

  async update(id: string, dto: UpdateMemberInput, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const before = await this.prisma.member.findFirst({
      where: { id, organizationId },
    });
    if (!before) throw new NotFoundException("Dizimista não encontrado.");

    try {
      const updated = await this.prisma.member.update({
        where: { id },
        data: dto,
      });

      await this.audit.record({
        organizationId,
        userId: actor.userId,
        action: "member.update",
        entityType: "Member",
        entityId: id,
        previousValue: before,
        newValue: updated,
      });

      const canView = await this.canViewFinancial(actor);
      return this.sanitize(updated, canView);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new ConflictException("Já existe um dizimista com esse CPF nesta organização.");
      }
      throw err;
    }
  }

  /**
   * Arquivamento (nunca exclusão definitiva — mantém histórico e QR Code
   * revogado, seguindo o mesmo princípio de não apagar registros usado
   * para contribuições, seção 30).
   */
  async archive(id: string, actor: AuthenticatedUser) {
    const organizationId = this.requireOrg(actor);

    const before = await this.prisma.member.findFirst({
      where: { id, organizationId },
    });
    if (!before) throw new NotFoundException("Dizimista não encontrado.");

    const updated = await this.prisma.member.update({
      where: { id },
      data: { archivedAt: new Date(), status: "ARQUIVADO", qrCodeRevoked: true },
    });

    await this.audit.record({
      organizationId,
      userId: actor.userId,
      action: "member.archive",
      entityType: "Member",
      entityId: id,
      previousValue: { status: before.status },
      newValue: { status: updated.status },
    });

    return updated;
  }
}
