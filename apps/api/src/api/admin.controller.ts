import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/admin")
export class AdminController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Get("catalog")
  async getCatalog(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getCatalog(withAuthorization(authorization)));
  }

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

  @Get("sources/:sourceCode")
  async getSource(
    @Headers("authorization") authorization: string | undefined,
    @Param("sourceCode") sourceCode: string,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getSource({ ...withAuthorization(authorization), sourceCode }));
  }

  @Patch("sources/:sourceCode")
  async updateSource(
    @Headers("authorization") authorization: string | undefined,
    @Param("sourceCode") sourceCode: string,
    @Body() body: ApiTypes.UpdateSourceRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.updateSource({ ...withAuthorization(authorization), body, sourceCode }));
  }

  @Post("shlokas")
  async createShloka(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: ApiTypes.CreateShlokaRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.shlokas({ ...withAuthorization(authorization), body }));
  }

  @Get("shlokas/:shlokaCode")
  async getShloka(
    @Headers("authorization") authorization: string | undefined,
    @Param("shlokaCode") shlokaCode: string,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getShloka({ ...withAuthorization(authorization), shlokaCode }));
  }

  @Patch("shlokas/:shlokaCode")
  async updateShloka(
    @Headers("authorization") authorization: string | undefined,
    @Param("shlokaCode") shlokaCode: string,
    @Body() body: ApiTypes.UpdateShlokaRequest,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.updateShloka({ ...withAuthorization(authorization), body, shlokaCode }));
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
