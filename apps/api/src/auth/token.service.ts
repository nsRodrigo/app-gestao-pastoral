import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Env } from "../config/env.validation";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./types";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.get("JWT_ACCESS_SECRET", { infer: true }),
      expiresIn: this.config.get("JWT_ACCESS_EXPIRES_IN", { infer: true }),
    });
  }

  private hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async issueRefreshToken(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(48).toString("hex");
    const days = this.config.get("JWT_REFRESH_EXPIRES_IN_DAYS", {
      infer: true,
    });
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashRefreshToken(token),
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return { token, expiresAt };
  }

  /** Retorna o registro do refresh token se válido (existe, não expirado, não revogado). */
  async findValidRefreshToken(token: string) {
    const tokenHash = this.hashRefreshToken(token);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!record) return null;
    if (record.revokedAt) return null;
    if (record.expiresAt.getTime() < Date.now()) return null;
    return record;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(token);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeRefreshTokenById(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
