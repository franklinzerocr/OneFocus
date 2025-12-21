import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses valid env", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      PORT: "3001",
      HOST: "127.0.0.1",
      LOG_LEVEL: "info",
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",

      CLICKUP_API_TOKEN: "test-token",
      CLICKUP_API_BASE_URL: "https://api.clickup.com/api/v2",
      CLICKUP_TIMEOUT_MS: "15000",
      CLICKUP_MAX_RETRIES: "1",
      CLICKUP_BACKOFF_BASE_MS: "50",
      CLICKUP_BACKOFF_MAX_MS: "50",



      WEBHOOKS_ENABLED: "true",
      WEBHOOK_MAX_BODY_BYTES: "1048576",
      GITHUB_WEBHOOK_SECRET: "test-secret",
      CLICKUP_WEBHOOK_SECRET: "test-secret",
    });


    expect(env.PORT).toBe(3001);
    expect(env.HOST).toBe("127.0.0.1");
  });

  it("throws on missing DATABASE_URL", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "development",
        PORT: "3000",
        HOST: "0.0.0.0",
        LOG_LEVEL: "info"
      })
    ).toThrow(/DATABASE_URL/i);
  });
});


 
