import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { registerWebhookRoutes } from "./routes";
import { registerRawBody } from "./registerRawBody";
import { resetConfigForTests } from "../config";

const hasDb = Boolean(process.env.DATABASE_URL);

// Set minimal env for config parsing in tests
process.env.DATABASE_URL ||= "postgresql://u:p@localhost:5432/db";
process.env.CLICKUP_API_TOKEN ||= "t";
process.env.GITHUB_WEBHOOK_SECRET ||= "s";
process.env.CLICKUP_WEBHOOK_SECRET ||= "s";
process.env.WEBHOOKS_ENABLED ||= "true";
process.env.WEBHOOK_MAX_BODY_BYTES ||= "1048576";

(hasDb ? describe : describe.skip)("webhook routes", () => {
  it("rejects invalid github signature with 401", async () => {
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
