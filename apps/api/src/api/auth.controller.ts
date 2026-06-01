import { Body, Controller, Get, Headers, Inject, Post, Res } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/auth")
export class AuthController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Post("register")
  async register(
    @Body() body: ApiTypes.RegisterRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.register({ body }));
  }

  @Post("login")
  async login(
    @Body() body: ApiTypes.LoginRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.login({ body }));
  }

  @Get("session")
  async getSession(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getSession(withAuthorization(authorization)));
  }

  @Post("logout")
  async logout(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.logout(withAuthorization(authorization)));
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
