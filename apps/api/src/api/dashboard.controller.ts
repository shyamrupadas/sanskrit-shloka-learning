import { Controller, Get, Headers, Inject, Res } from "@nestjs/common";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/dashboard")
export class DashboardController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Get()
  async getDashboard(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getDashboard(withAuthorization(authorization)));
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}
