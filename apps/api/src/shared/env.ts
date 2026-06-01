import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";

export function loadApiEnv(): void {
  const cwdEnv = resolve(process.cwd(), ".env.local");
  const apiEnv = resolve(process.cwd(), "apps/api/.env.local");

  if (existsSync(cwdEnv)) {
    config({ path: cwdEnv, override: false, quiet: true });
    return;
  }

  if (existsSync(apiEnv)) {
    config({ path: apiEnv, override: false, quiet: true });
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
