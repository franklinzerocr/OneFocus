import Fastify from "fastify";
import { HealthResponseSchema } from "@onefocus/shared";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  const payload = {
    ok: true,
    service: "onefocus-backend",
    ts: new Date().toISOString()
  };

  // Runtime validation (keeps the habit for webhook payloads later)
  HealthResponseSchema.parse(payload);

  return payload;
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
