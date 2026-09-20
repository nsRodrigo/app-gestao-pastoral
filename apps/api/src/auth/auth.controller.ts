import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { LoginInput, LoginSchema, RefreshTokenInput, RefreshTokenSchema } from "@gestao-pastoral/shared";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { Public } from "./decorators/public.decorator";
import { AuthService } from "./auth.service";

function extractMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(LoginSchema)) body: LoginInput, @Req() req: Request) {
    return this.authService.login(body.email, body.password, extractMeta(req));
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) body: RefreshTokenInput,
    @Req() req: Request,
  ) {
    return this.authService.refresh(body.refreshToken, extractMeta(req));
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new ZodValidationPipe(RefreshTokenSchema)) body: RefreshTokenInput) {
    await this.authService.logout(body.refreshToken);
  }
}
