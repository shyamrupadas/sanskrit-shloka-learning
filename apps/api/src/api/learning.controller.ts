import { Controller, Get, Headers, Inject, Res } from "@nestjs/common";

import { ApiHandlersService } from "./api-handlers.service.js";
import { sendContractResponse } from "./contract-response.js";

@Controller("api/learning")
export class LearningController {
  constructor(@Inject(ApiHandlersService) private readonly handlers: ApiHandlersService) {}

  @Get("tips")
  async getTips(
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(response, await this.handlers.getTips(
      authorization === undefined ? {} : { authorization },
    ));
  }
}
