import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";

interface HealthResponse {
  status: "ok";
}

@Controller("health")
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get("live")
  liveness(): HealthResponse {
    return { status: "ok" };
  }

  @Get("ready")
  async readiness(): Promise<HealthResponse> {
    try {
      await this.database.checkReadiness();
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException({ status: "unavailable" });
    }
  }
}
