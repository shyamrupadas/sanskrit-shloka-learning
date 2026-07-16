import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { BlockList, isIP } from "node:net";

import type { INestApplication } from "@nestjs/common";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";

import type { ApiConfig } from "./env.js";

export interface AccessLogEntry {
  durationMs: number;
  event: "http_request";
  level: "info";
  method: string;
  requestId: string;
  route: string;
  status: number;
  timestamp: string;
}

export interface HttpGuardrailOptions {
  authRateLimit?: {
    limit?: number;
    windowMs?: number;
  };
  writeAccessLog?: (entry: AccessLogEntry) => void;
}

interface HttpRequest {
  headers: IncomingHttpHeaders;
  method: string;
  originalUrl?: string;
  route?: { path?: unknown };
  socket: { remoteAddress?: string };
}

interface HttpResponse {
  once(event: "finish", listener: () => void): void;
  setHeader(name: string, value: string): void;
  statusCode: number;
}

interface ExpressApplication {
  set(name: string, value: unknown): void;
}

const authEndpointPaths = ["/api/auth/login", "/api/auth/register"] as const;
const authRateLimitDefaults = {
  limit: 10,
  windowMs: 15 * 60 * 1_000,
} as const;
const corsMethods = ["GET", "POST", "PATCH", "OPTIONS"] as const;
const corsHeaders = ["Content-Type", "Authorization"] as const;
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Railway routes public HTTP traffic over its private network. Trust only those
// immediate proxy ranges, never an unconditional X-Forwarded-For chain.
const railwayProxyRanges = ["linklocal", "uniquelocal", "100.0.0.0/8"] as const;
const railwayProxyAddresses = createRailwayProxyBlockList();

export function configureHttpGuardrails(
  app: INestApplication,
  apiConfig: ApiConfig,
  options: HttpGuardrailOptions = {},
): void {
  const expressApplication = app.getHttpAdapter().getInstance() as ExpressApplication;
  expressApplication.set("trust proxy", railwayProxyRanges);

  app.use(createAccessLogMiddleware(options.writeAccessLog));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    allowedHeaders: corsHeaders,
    credentials: false,
    methods: corsMethods,
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, origin?: boolean | string) => void,
    ) => {
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      callback(null, origin === apiConfig.frontendOrigin ? apiConfig.frontendOrigin : false);
    },
  });

  const authRateLimiter = rateLimit({
    keyGenerator: (request) => authRateLimitKey(request),
    legacyHeaders: false,
    limit: options.authRateLimit?.limit ?? authRateLimitDefaults.limit,
    message: {
      error: "Too Many Requests",
      message: "Too many authentication attempts. Try again later.",
      statusCode: 429,
    },
    standardHeaders: "draft-8",
    windowMs: options.authRateLimit?.windowMs ?? authRateLimitDefaults.windowMs,
  });
  app.use(authEndpointPaths, authRateLimiter);
}

function createAccessLogMiddleware(writeAccessLog?: (entry: AccessLogEntry) => void) {
  const write = writeAccessLog ?? ((entry: AccessLogEntry) => console.log(JSON.stringify(entry)));

  return (request: HttpRequest, response: HttpResponse, next: () => void): void => {
    const startedAt = process.hrtime.bigint();
    const requestId = resolveRequestId(request.headers);
    response.setHeader("X-Request-Id", requestId);

    response.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      write({
        durationMs: Math.round(durationMs * 1_000) / 1_000,
        event: "http_request",
        level: "info",
        method: request.method,
        requestId,
        route: registeredRoute(request),
        status: response.statusCode,
        timestamp: new Date().toISOString(),
      });
    });

    next();
  };
}

function resolveRequestId(headers: IncomingHttpHeaders): string {
  const requestId = singleHeader(headers["x-request-id"]);
  if (requestId && requestIdPattern.test(requestId)) {
    return requestId;
  }

  const railwayRequestId = singleHeader(headers["x-railway-request-id"]);
  if (railwayRequestId && requestIdPattern.test(railwayRequestId)) {
    return railwayRequestId;
  }

  return randomUUID();
}

function registeredRoute(request: HttpRequest): string {
  const path = request.route?.path;
  if (typeof path === "string") {
    return path;
  }

  const requestPath = request.originalUrl?.split("?", 1)[0];
  if (requestPath && authEndpointPaths.some((authPath) => authPath === requestPath)) {
    return requestPath;
  }

  return "unmatched";
}

function authRateLimitKey(request: {
  headers: IncomingHttpHeaders;
  socket: { remoteAddress?: string };
}): string {
  const remoteAddress = request.socket.remoteAddress;
  const railwayClientAddress = singleHeader(request.headers["x-real-ip"]);

  if (
    remoteAddress &&
    railwayClientAddress &&
    isRailwayProxyAddress(remoteAddress) &&
    isIP(railwayClientAddress) !== 0
  ) {
    return ipKeyGenerator(railwayClientAddress);
  }

  return ipKeyGenerator(remoteAddress ?? "unknown-client");
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function createRailwayProxyBlockList(): BlockList {
  const blockList = new BlockList();
  blockList.addSubnet("10.0.0.0", 8, "ipv4");
  blockList.addSubnet("172.16.0.0", 12, "ipv4");
  blockList.addSubnet("192.168.0.0", 16, "ipv4");
  blockList.addSubnet("169.254.0.0", 16, "ipv4");
  blockList.addSubnet("100.0.0.0", 8, "ipv4");
  blockList.addSubnet("fc00::", 7, "ipv6");
  blockList.addSubnet("fe80::", 10, "ipv6");
  return blockList;
}

function isRailwayProxyAddress(address: string): boolean {
  const normalizedAddress = normalizeIpAddress(address);
  const family = isIP(normalizedAddress);

  if (family === 4) {
    return railwayProxyAddresses.check(normalizedAddress, "ipv4");
  }

  if (family === 6) {
    return railwayProxyAddresses.check(normalizedAddress, "ipv6");
  }

  return false;
}

function normalizeIpAddress(address: string): string {
  if (address.startsWith("::ffff:")) {
    const ipv4Address = address.slice("::ffff:".length);
    if (isIP(ipv4Address) === 4) {
      return ipv4Address;
    }
  }

  const zoneIndex = address.indexOf("%");
  return zoneIndex === -1 ? address : address.slice(0, zoneIndex);
}
