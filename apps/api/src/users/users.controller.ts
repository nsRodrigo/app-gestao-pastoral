import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreateStaffUserInput,
  CreateStaffUserSchema,
  Permission,
  UpdateUserRoleInput,
  UpdateUserRoleSchema,
  UpdateUserStatusInput,
  UpdateUserStatusSchema,
} from "@gestao-pastoral/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../rbac/permissions.decorator";
import { CurrentUser } from "../rbac/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(Permission.USER_MANAGE)
  create(
    @Body(new ZodValidationPipe(CreateStaffUserSchema)) body: CreateStaffUserInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.createStaffUser(body, user);
  }

  @Get()
  @Permissions(Permission.USER_MANAGE)
  list(@CurrentUser() user: AuthenticatedUser, @Query("organizationId") organizationId?: string) {
    return this.usersService.listForOrganization(user, organizationId);
  }

  @Patch(":id/role")
  @Permissions(Permission.ROLE_ASSIGN)
  updateRole(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateUserRoleSchema)) body: UpdateUserRoleInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, body, user);
  }

  @Patch(":id/status")
  @Permissions(Permission.USER_MANAGE)
  updateStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateUserStatusSchema)) body: UpdateUserStatusInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, body, user);
  }
}
