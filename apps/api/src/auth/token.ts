import { createHash, randomBytes } from "node:crypto";

const bearerPrefix = "Bearer ";

export function createAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization?.startsWith(bearerPrefix)) {
    return undefined;
  }

  const token = authorization.slice(bearerPrefix.length).trim();
  return token.length > 0 ? token : undefined;
}
