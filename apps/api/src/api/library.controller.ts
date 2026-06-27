import { Body, Controller, Get, Headers, Inject, Param, Patch, Res } from "@nestjs/common";
import type { ApiTypes } from "@sanskrit-shloka-learning/api-contract";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/library")
export class LibraryController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Get()
  async getLibrary(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getLibrary(withAuthorization(authorization)));
  }

  @Patch("items/:shlokaCode")
  async updateItem(
    @Param("shlokaCode") shlokaCode: string,
    @Body() body: ApiTypes.UpdateLibraryItemRequest,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(
      response,
      await this.handlers.updateItem({
        ...withAuthorization(authorization),
        body,
        shlokaCode,
      }),
    );
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
