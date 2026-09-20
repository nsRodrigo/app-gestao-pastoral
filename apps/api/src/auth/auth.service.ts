import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ALL_PERMISSIONS, RoleName } from "@gestao-pastoral/shared";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { JwtPayload } from "./types";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: RoleName;
    organizationId: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  /** Monta o payload do JWT com o papel e as permissões atuais do usuário. */
  async buildJwtPayload(userId: string): Promise<{
    payload: JwtPayload;
    user: { id: string; name: string; email: string };
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });

    if (user.isSuperAdmin) {
      return {
        payload: {
          sub: user.id,
          organizationId: null,
          role: RoleName.SUPER_ADMIN,
          permissions: ALL_PERMISSIONS,
        },
        user: { id: user.id, name: user.name, email: user.email },
      };
    }

    // Nesta fase um usuário possui no máximo um papel (em sua organização).
    const userRole = user.userRoles[0];

    const role = (userRole?.role.name ?? RoleName.DIZIMISTA) as RoleName;
    const permissions =
      userRole?.role.rolePermissions.map((rp) => rp.permission.key) ?? [];

    return {
      payload: {
        sub: user.id,
        organizationId: userRole?.organizationId ?? user.organizationId,
        role,
        permissions,
      },
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Mensagem genérica: nunca revelar se o e-mail existe ou não.
    const invalidCredentials = () =>
      new UnauthorizedException("E-mail ou senha inválidos.");

    if (!user || !user.isActive) throw invalidCredentials();

    const validPassword = await this.passwords.verify(
      user.passwordHash,
      password,
    );
    if (!validPassword) throw invalidCredentials();

    const { payload, user: userData } = await this.buildJwtPayload(user.id);

    const accessToken = this.tokens.signAccessToken(payload);
    const { token: refreshToken } = await this.tokens.issueRefreshToken(
      user.id,
      meta,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: payload.role,
        organizationId: payload.organizationId,
      },
    };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    const record = await this.tokens.findValidRefreshToken(refreshToken);
    if (!record) {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    // Rotação: revoga o token usado e emite um novo par.
    await this.tokens.revokeRefreshTokenById(record.id);

    const { payload, user: userData } = await this.buildJwtPayload(
      record.userId,
    );

    const accessToken = this.tokens.signAccessToken(payload);
    const { token: newRefreshToken } = await this.tokens.issueRefreshToken(
      record.userId,
      meta,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: payload.role,
        organizationId: payload.organizationId,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }
}
