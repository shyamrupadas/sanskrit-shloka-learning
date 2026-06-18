import { Body, Controller, Get, Headers, Inject, Post, Res } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/admin")
export class AdminController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Post("sources")
  async createSource(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ApiTypes.CreateSourceRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.sources({ ...withAuthorization(authorization), body }));
  }

  @Get("sources/options")
  async getSourceOptions(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getOptions(withAuthorization(authorization)));
  }

  @Post("shlokas")
  async createShloka(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ApiTypes.CreateShlokaRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.shlokas({ ...withAuthorization(authorization), body }));
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
