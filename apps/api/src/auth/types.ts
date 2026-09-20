import { RoleName } from "@gestao-pastoral/shared";

/** Payload assinado no JWT de acesso. */
export interface JwtPayload {
  sub: string;
  organizationId: string | null;
  role: RoleName;
  permissions: string[];
}

/** Formato de `req.user` após passar pelo JwtAuthGuard. */
export interface AuthenticatedUser {
  userId: string;
  organizationId: string | null;
  role: RoleName;
  permissions: string[];
}
