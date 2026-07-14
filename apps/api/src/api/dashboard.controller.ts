import { Controller, Get, Headers, Inject, Query, Res } from "@nestjs/common";

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

  @Get("learning-shlokas")
  async getLearningShlokas(
    @Query("limit") limit: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(
      response,
      await this.handlers.getLearningShlokas({
        ...withAuthorization(authorization),
        ...withLimit(limit),
      }),
    );
  }

  @Get("review-shlokas")
  async getReviewShlokas(
    @Query("timeZone") timeZone: string | undefined,
    @Query("limit") limit: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(
      response,
      await this.handlers.getReviewShlokas({
        ...withAuthorization(authorization),
        ...withLimit(limit),
        timeZone: timeZone ?? "",
      }),
    );
  }

  @Get("streak")
  async getStreak(
    @Query("timeZone") timeZone: string | undefined,
    @Headers("authorization") authorization: string | undefined,
    @Res({ passthrough: true }) response: { status(code: number): unknown },
  ): Promise<unknown> {
    return sendContractResponse(
      response,
      await this.handlers.getStreak({
        ...withAuthorization(authorization),
        timeZone: timeZone ?? "",
      }),
    );
  }
}

function withAuthorization(authorization: string | undefined): { authorization?: string } {
  return authorization === undefined ? {} : { authorization };
}

function withLimit(limit: string | undefined): { limit?: number } {
  return limit === undefined ? {} : { limit: Number(limit) };
}
