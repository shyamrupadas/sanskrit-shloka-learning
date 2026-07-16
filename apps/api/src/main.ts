import "reflect-metadata";

import { pathToFileURL } from "node:url";

import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { type ApiConfig, ApiConfigurationError, loadApiConfig } from "./shared/env.js";
import { configureHttpGuardrails } from "./shared/http-guardrails.js";

interface BootstrapDependencies {
  createApplication?: (apiConfig: ApiConfig) => Promise<INestApplication>;
  environment?: NodeJS.ProcessEnv;
}

export async function bootstrap(dependencies: BootstrapDependencies = {}): Promise<void> {
  const apiConfig = loadApiConfig(dependencies.environment ?? process.env);
  const createApplication = dependencies.createApplication ??
    ((config) => NestFactory.create(AppModule.forRoot(config)));
  const app = await createApplication(apiConfig);

  configureHttpGuardrails(app, apiConfig);
  await app.listen(apiConfig.port, apiConfig.host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await bootstrap().catch((error: unknown) => {
    console.error(formatStartupError(error));
    process.exitCode = 1;
  });
}

export function formatStartupError(error: unknown): string {
  const message = error instanceof ApiConfigurationError
    ? error.message
    : "API failed to start";

  return JSON.stringify({
    event: "startup_failed",
    level: "error",
    message,
  });
}
