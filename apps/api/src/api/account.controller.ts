import { Body, Controller, Get, Headers, Inject, Patch, Res } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/account")
export class AccountController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Get("settings")
  async getSettings(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getSettings(withAuthorization(authorization)));
  }

  @Patch("settings")
  async updateSettings(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ApiTypes.UpdateAccountSettingsRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(
      response,
      await this.handlers.updateSettings({ ...withAuthorization(authorization), body }),
    );
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
