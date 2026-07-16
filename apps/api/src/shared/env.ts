import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadDotenv } from "dotenv";

export type ApiEnvironment = "development" | "test" | "production";

export interface ApiConfig {
  databaseDirectUrl: string;
  databasePoolMax: number;
  databaseUrl: string;
  environment: ApiEnvironment;
  frontendOrigin: string;
  host: "0.0.0.0";
  port: number;
}

interface ApiConfigDependencies {
  cwd?: string;
  loadLocalEnvironment?: (environment: NodeJS.ProcessEnv, cwd: string) => void;
}

const localDefaults = {
  databasePoolMax: "5",
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/sanskrit_shloka_learning",
  frontendOrigin: "http://localhost:5173",
  port: "3000",
} as const;

export class ApiConfigurationError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid API configuration: ${issues.join("; ")}`);
    this.name = "ApiConfigurationError";
  }
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env,
  dependencies: ApiConfigDependencies = {},
): ApiConfig {
  const mode = parseEnvironment(environment.NODE_ENV);
  const cwd = dependencies.cwd ?? process.cwd();

  if (mode !== "production") {
    (dependencies.loadLocalEnvironment ?? loadLocalEnvironment)(environment, cwd);
  }

  const issues: string[] = [];
  const production = mode === "production";
  const portValue = requiredValue(
    environment.PORT,
    "PORT",
    production ? undefined : localDefaults.port,
    issues,
  );
  const originValue = requiredValue(
    environment.FRONTEND_ORIGIN,
    "FRONTEND_ORIGIN",
    production ? undefined : localDefaults.frontendOrigin,
    issues,
  );
  const databaseUrlValue = requiredValue(
    environment.DATABASE_URL,
    "DATABASE_URL",
    production ? undefined : localDefaults.databaseUrl,
    issues,
  );
  const databasePoolMaxValue = requiredValue(
    environment.DATABASE_POOL_MAX,
    "DATABASE_POOL_MAX",
    localDefaults.databasePoolMax,
    issues,
  );
  const databaseDirectUrlValue = requiredValue(
    environment.DATABASE_DIRECT_URL,
    "DATABASE_DIRECT_URL",
    production ? undefined : databaseUrlValue,
    issues,
  );

  const port = parsePort(portValue, issues);
  const frontendOrigin = parseFrontendOrigin(originValue, issues);
  const databaseUrl = parseDatabaseUrl(databaseUrlValue, "DATABASE_URL", issues);
  const databasePoolMax = parseDatabasePoolMax(databasePoolMaxValue, issues);
  const databaseDirectUrl = parseDatabaseUrl(
    databaseDirectUrlValue,
    "DATABASE_DIRECT_URL",
    issues,
  );

  if (production && databaseUrl && databaseDirectUrl && databaseUrl === databaseDirectUrl) {
    issues.push("DATABASE_DIRECT_URL must use a separate direct database endpoint");
  }

  if (production && databaseUrl && databaseDirectUrl) {
    validateProductionDatabaseTopology(databaseUrl, databaseDirectUrl, issues);
  }

  if (
    issues.length > 0 ||
    port === undefined ||
    frontendOrigin === undefined ||
    databasePoolMax === undefined ||
    databaseUrl === undefined ||
    databaseDirectUrl === undefined
  ) {
    throw new ApiConfigurationError(issues);
  }

  const apiConfig: ApiConfig = {
    databaseDirectUrl,
    databasePoolMax,
    databaseUrl,
    environment: mode,
    frontendOrigin,
    host: "0.0.0.0",
    port,
  };

  applyConfigToEnvironment(apiConfig, environment);
  return apiConfig;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseEnvironment(value: string | undefined): ApiEnvironment {
  const mode = value ?? "development";
  if (mode === "development" || mode === "test" || mode === "production") {
    return mode;
  }

  throw new ApiConfigurationError([
    "NODE_ENV must be one of development, test, or production",
  ]);
}

function requiredValue(
  value: string | undefined,
  name: string,
  fallback: string | undefined,
  issues: string[],
): string | undefined {
  const resolved = value ?? fallback;
  if (resolved === undefined || resolved.length === 0) {
    issues.push(`${name} is required`);
    return undefined;
  }

  if (resolved !== resolved.trim()) {
    issues.push(`${name} must not contain surrounding whitespace`);
    return undefined;
  }

  return resolved;
}

function parsePort(value: string | undefined, issues: string[]): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^[1-9]\d{0,4}$/.test(value)) {
    issues.push("PORT must be an integer between 1 and 65535");
    return undefined;
  }

  const port = Number(value);
  if (port > 65_535) {
    issues.push("PORT must be an integer between 1 and 65535");
    return undefined;
  }

  return port;
}

function parseDatabasePoolMax(
  value: string | undefined,
  issues: string[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^[1-9]\d{0,2}$/.test(value)) {
    issues.push("DATABASE_POOL_MAX must be an integer between 1 and 999");
    return undefined;
  }

  return Number(value);
}

function parseFrontendOrigin(value: string | undefined, issues: string[]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    const isOriginOnly = url.pathname === "/" && url.search === "" && url.hash === "";
    const hasCredentials = url.username !== "" || url.password !== "";

    if (!isHttp || !isOriginOnly || hasCredentials || url.hostname.includes("*")) {
      throw new Error("invalid origin");
    }

    return url.origin;
  } catch {
    issues.push(
      "FRONTEND_ORIGIN must be one exact HTTP(S) origin without credentials, path, query, or wildcard",
    );
    return undefined;
  }
}

function parseDatabaseUrl(
  value: string | undefined,
  name: "DATABASE_URL" | "DATABASE_DIRECT_URL",
  issues: string[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    const url = new URL(value);
    const isPostgres = url.protocol === "postgres:" || url.protocol === "postgresql:";
    const hasDatabase = url.pathname.length > 1;

    if (!isPostgres || url.hostname === "" || url.username === "" || !hasDatabase) {
      throw new Error("invalid database URL");
    }

    return value;
  } catch {
    issues.push(`${name} must be a valid PostgreSQL connection URL`);
    return undefined;
  }
}

function validateProductionDatabaseTopology(
  databaseUrl: string,
  databaseDirectUrl: string,
  issues: string[],
): void {
  const runtimeHostname = new URL(databaseUrl).hostname;
  const migrationHostname = new URL(databaseDirectUrl).hostname;

  if (isNeonHostname(runtimeHostname) && !runtimeHostname.includes("-pooler")) {
    issues.push("DATABASE_URL must use the pooled Neon endpoint in production");
  }

  if (migrationHostname.includes("-pooler")) {
    issues.push("DATABASE_DIRECT_URL must not use a pooled endpoint");
  }
}

function isNeonHostname(hostname: string): boolean {
  return hostname === "neon.tech" || hostname.endsWith(".neon.tech");
}

function loadLocalEnvironment(environment: NodeJS.ProcessEnv, cwd: string): void {
  const paths = [resolve(cwd, ".env.local"), resolve(cwd, "apps/api/.env.local")];
  const path = paths.find((candidate) => existsSync(candidate));

  if (path) {
    loadDotenv({ path, override: false, quiet: true, processEnv: environment });
  }
}

function applyConfigToEnvironment(apiConfig: ApiConfig, environment: NodeJS.ProcessEnv): void {
  environment.NODE_ENV = apiConfig.environment;
  environment.PORT = String(apiConfig.port);
  environment.FRONTEND_ORIGIN = apiConfig.frontendOrigin;
  environment.DATABASE_POOL_MAX = String(apiConfig.databasePoolMax);
  environment.DATABASE_URL = apiConfig.databaseUrl;
  environment.DATABASE_DIRECT_URL = apiConfig.databaseDirectUrl;
}
