import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  CreateOrganizationInput,
  CreateOrganizationSchema,
  Permission,
  UpdateOrganizationSettingsInput,
  UpdateOrganizationSettingsSchema,
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

  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findById(id, user);
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
