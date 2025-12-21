import { describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

// 1) Set env BEFORE importing any module that calls getConfig() at import time
process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/onefocus_test"; // dummy; DB is mocked
process.env.CLICKUP_API_TOKEN ||= "test-token";
process.env.GITHUB_WEBHOOK_SECRET ||= "test-secret";
process.env.CLICKUP_WEBHOOK_SECRET ||= "test-secret";
process.env.WEBHOOKS_ENABLED ||= "true";
process.env.WEBHOOK_MAX_BODY_BYTES ||= "1048576";

// 2) Mock DB repo so routes don't hit Prisma in CI
vi.mock("../repositories/webhookEventsRepo", () => {
  return {
    insertWebhookEvent: vi.fn(async () => ({ id: "evt_test_id" })),
    markWebhookProcessed: vi.fn(async () => ({})),
    markWebhookFailed: vi.fn(async () => ({})),
  };
});

describe("webhook routes", () => {
  it("rejects invalid github signature with 401", async () => {
    // 3) Dynamic import AFTER env + mocks are set
    const { registerWebhookRoutes } = await import("./routes");
    const { registerRawBody } = await import("./registerRawBody");
    const { resetConfigForTests } = await import("../config");

    resetConfigForTests();

    const app = Fastify();

    await app.register(async (scoped) => {
      registerRawBody(scoped);
      await registerWebhookRoutes(scoped);
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/github",
      headers: {
        "content-type": "application/json",
        "x-github-delivery": "d1",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=deadbeef",
      },
      payload: JSON.stringify({ a: 1 }),
    });

    expect(res.statusCode).toBe(401);
  });
});
