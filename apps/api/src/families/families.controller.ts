import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreateFamilyInput,
  CreateFamilySchema,
  Permission,
  UpdateFamilyInput,
  UpdateFamilySchema,
} from "@gestao-pastoral/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../rbac/permissions.decorator";
import { CurrentUser } from "../rbac/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";
import { FamiliesService } from "./families.service";

@Controller("families")
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Post()
  @Permissions(Permission.FAMILY_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateFamilySchema)) body: CreateFamilyInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familiesService.create(body, user);
  }

  @Get()
  @Permissions(Permission.FAMILY_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.familiesService.list(user, search);
  }

  @Get(":id")
  @Permissions(Permission.FAMILY_READ)
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.familiesService.findById(id, user);
  }

  @Patch(":id")
  @Permissions(Permission.FAMILY_UPDATE)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateFamilySchema)) body: UpdateFamilyInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familiesService.update(id, body, user);
  }
}
