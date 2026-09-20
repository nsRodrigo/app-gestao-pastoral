import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  CreateOrganizationInput,
  CreateOrganizationSchema,
  Permission,
  UpdateOrganizationSettingsInput,
  UpdateOrganizationSettingsSchema,
  UpdateRolePermissionsInput,
  UpdateRolePermissionsSchema,
} from "@gestao-pastoral/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../rbac/permissions.decorator";
import { CurrentUser } from "../rbac/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Permissions(Permission.ORGANIZATION_MANAGE)
  create(
    @Body(new ZodValidationPipe(CreateOrganizationSchema)) body: CreateOrganizationInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.create(body, user);
  }

  @Get()
  listAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listAll(user);
  }

  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findById(id, user);
  }

  @Get(":id/role-permissions")
  getRolePermissions(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.getRolePermissions(id, user);
  }

  @Patch(":id/role-permissions")
  updateRolePermissions(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateRolePermissionsSchema))
    body: UpdateRolePermissionsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.updateRolePermissions(id, body, user);
  }

  @Patch(":id/settings")
  @Permissions(Permission.ORGANIZATION_MANAGE)
  updateSettings(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSettingsSchema))
    body: UpdateOrganizationSettingsInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.updateSettings(id, body, user);
  }
}
