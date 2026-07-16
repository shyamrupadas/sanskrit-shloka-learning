import { DynamicModule, Global, Module } from "@nestjs/common";

import type { ApiConfig } from "./env.js";

export const API_CONFIG = Symbol("API_CONFIG");

@Global()
@Module({})
export class ApiConfigModule {
  static forRoot(apiConfig: ApiConfig): DynamicModule {
    return {
      module: ApiConfigModule,
      providers: [{ provide: API_CONFIG, useValue: apiConfig }],
      exports: [API_CONFIG],
    };
  }
}
