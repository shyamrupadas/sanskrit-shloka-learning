import "reflect-metadata";

import { pathToFileURL } from "node:url";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { loadApiEnv } from "./shared/env.js";

export async function bootstrap(): Promise<void> {
  loadApiEnv();

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await bootstrap();
}
