import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, RoleName } from "@gestao-pastoral/shared";
import { PermissionsGuard } from "./permissions.guard";
import { AuthenticatedUser } from "../auth/types";

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  function makeGuard(required: Permission[] | undefined) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as unknown as Reflector;
    return new PermissionsGuard(reflector);
  }

  it("permite acesso quando o endpoint não exige permissões", () => {
    const guard = makeGuard(undefined);
    const ctx = makeContext({
      userId: "u1",
      organizationId: "o1",
      role: RoleName.DIZIMISTA,
      permissions: [],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("SUPER_ADMIN sempre passa, mesmo sem a permissão explícita", () => {
    const guard = makeGuard([Permission.ORGANIZATION_MANAGE]);
    const ctx = makeContext({
      userId: "u1",
      organizationId: null,
      role: RoleName.SUPER_ADMIN,
      permissions: [],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("nega acesso quando o usuário não possui a permissão exigida", () => {
    const guard = makeGuard([Permission.MEMBER_FINANCIAL_READ]);
    const ctx = makeContext({
      userId: "u1",
      organizationId: "o1",
      role: RoleName.SECRETARIA,
      permissions: [Permission.MEMBER_READ],
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("permite acesso quando o usuário possui todas as permissões exigidas", () => {
    const guard = makeGuard([Permission.MEMBER_READ, Permission.MEMBER_CREATE]);
    const ctx = makeContext({
      userId: "u1",
      organizationId: "o1",
      role: RoleName.SECRETARIA,
      permissions: [Permission.MEMBER_READ, Permission.MEMBER_CREATE],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("nega acesso quando não há usuário autenticado no request", () => {
    const guard = makeGuard([Permission.MEMBER_READ]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
