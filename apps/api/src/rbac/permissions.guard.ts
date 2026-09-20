import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, RoleName } from "@gestao-pastoral/shared";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import { AuthenticatedUser } from "../auth/types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) return false;

    if (user.role === RoleName.SUPER_ADMIN) return true;

    const hasAll = required.every((p) => user.permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(
        "Você não tem permissão para realizar esta ação.",
      );
    }
    return true;
  }
}
