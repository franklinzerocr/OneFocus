import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses valid env", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      PORT: "3001",
      HOST: "127.0.0.1",
      LOG_LEVEL: "info",
      DATABASE_URL: "postgresql://u:p@localhost:5432/db"
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
