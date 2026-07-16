import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createPoolConfig } from "./postgres-connection.js";

describe("createPoolConfig", () => {
  test("creates a small Neon-compatible runtime pool without server startup timeouts", () => {
    const config = createPoolConfig(
      "postgresql://api:secret@ep-example-pooler.neon.tech/app?sslmode=require&channel_binding=require",
      { max: 5 },
    );
    const rawConfig = config as Record<string, unknown>;

    assert.equal(
      config.connectionString,
      "postgresql://api:secret@ep-example-pooler.neon.tech/app?channel_binding=require",
    );
    assert.equal(config.max, 5);
    assert.equal(config.min, 0);
    assert.equal(config.idleTimeoutMillis, 240_000);
    assert.equal(config.connectionTimeoutMillis, 10_000);
    assert.equal(config.keepAlive, true);
    assert.equal(config.keepAliveInitialDelayMillis, 10_000);
    assert.equal(config.query_timeout, 30_000);
    assert.deepEqual(config.ssl, { rejectUnauthorized: true });
    assert.equal("maxLifetimeSeconds" in rawConfig, false);
    assert.equal("statement_timeout" in rawConfig, false);
    assert.equal("lock_timeout" in rawConfig, false);
  });

  test("takes the per-replica maximum from validated configuration", () => {
    const config = createPoolConfig(
      "postgresql://postgres:postgres@localhost:5432/app",
      { max: 7 },
    );

    assert.equal(config.max, 7);
    assert.equal(config.ssl, undefined);
  });
});
