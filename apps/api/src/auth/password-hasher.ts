import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { Injectable } from "@nestjs/common";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("base64url");
    const key = (await scrypt(password, salt, keyLength)) as Buffer;

    return `scrypt$${salt}$${key.toString("base64url")}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [, salt, storedKey] = storedHash.split("$");
    if (!salt || !storedKey) {
      return false;
    }

    const key = (await scrypt(password, salt, keyLength)) as Buffer;
    const storedKeyBuffer = Buffer.from(storedKey, "base64url");

    if (key.byteLength !== storedKeyBuffer.byteLength) {
      return false;
    }

    return timingSafeEqual(key, storedKeyBuffer);
  }
}
