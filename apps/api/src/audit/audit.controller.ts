import { Controller, Get, Query } from "@nestjs/common";
import { Permission } from "@gestao-pastoral/shared";
import { Permissions } from "../rbac/permissions.decorator";
import { CurrentUser } from "../rbac/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";
import { AuditService } from "./audit.service";

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(Permission.AUDIT_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query("take") take?: string,
    @Query("skip") skip?: string,
  ) {
    if (!user.organizationId) return [];
    return this.auditService.listForOrganization(
      user.organizationId,
      take ? Number(take) : undefined,
      skip ? Number(skip) : undefined,
    );
  }
}
