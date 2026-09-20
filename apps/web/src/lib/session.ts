import { cookies } from "next/headers";
import { Permission, RoleName } from "@gestao-pastoral/shared";
import { COOKIE } from "./config";
import { decodeJwtPayload } from "./jwt";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface JwtAccessPayload {
  sub: string;
  organizationId: string | null;
  role: RoleName;
  permissions: Permission[];
}

export interface Session {
  user: SessionUser;
  role: RoleName;
  permissions: Permission[];
  organizationId: string | null;
  accessToken: string;
}

/** Lê a sessão atual a partir dos cookies (Server Components/Route Handlers). */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(COOKIE.access)?.value;
  const sessionCookie = store.get(COOKIE.session)?.value;
  if (!accessToken || !sessionCookie) return null;

  const payload = decodeJwtPayload<JwtAccessPayload>(accessToken);
  if (!payload) return null;

  try {
    const user = JSON.parse(sessionCookie) as SessionUser;
    return {
      user,
      role: payload.role,
      permissions: payload.permissions,
      organizationId: payload.organizationId,
      accessToken,
    };
  } catch {
    return null;
  }
}

export function hasPermission(session: Session, permission: Permission): boolean {
  return session.role === RoleName.SUPER_ADMIN || session.permissions.includes(permission);
}
