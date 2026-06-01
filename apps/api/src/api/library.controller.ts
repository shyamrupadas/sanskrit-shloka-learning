import { Controller, Get, Headers, Res } from "@nestjs/common";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/library")
export class LibraryController {
  constructor(private readonly handlers: ApiHandlersService) {}

  @Get()
  async getLibrary(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getLibrary(withAuthorization(authorization)));
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
