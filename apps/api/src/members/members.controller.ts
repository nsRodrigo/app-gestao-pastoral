import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  CreateMemberInput,
  CreateMemberSchema,
  Permission,
  QuickRegisterMemberInput,
  QuickRegisterMemberSchema,
  UpdateMemberInput,
  UpdateMemberSchema,
} from "@gestao-pastoral/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Permissions } from "../rbac/permissions.decorator";
import { CurrentUser } from "../rbac/current-user.decorator";
import { AuthenticatedUser } from "../auth/types";
import { MembersService } from "./members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Permissions(Permission.MEMBER_CREATE)
  create(
    @Body(new ZodValidationPipe(CreateMemberSchema)) body: CreateMemberInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.create(body, user);
  }

  @Post("quick")
  @Permissions(Permission.MEMBER_CREATE)
  quickRegister(
    @Body(new ZodValidationPipe(QuickRegisterMemberSchema))
    body: QuickRegisterMemberInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.quickRegister(body, user);
  }

  @Get()
  @Permissions(Permission.MEMBER_READ)
  list(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.membersService.list(user, search);
  }

  @Get(":id")
  @Permissions(Permission.MEMBER_READ)
  findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membersService.findById(id, user);
  }

  @Patch(":id")
  @Permissions(Permission.MEMBER_UPDATE)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateMemberSchema)) body: UpdateMemberInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.update(id, body, user);
  }

  @Patch(":id/archive")
  @Permissions(Permission.MEMBER_ARCHIVE)
  archive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membersService.archive(id, user);
  }
}
