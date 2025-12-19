import Fastify from "fastify";
import { HealthResponseSchema } from "@onefocus/shared";
import { getConfig } from "./config";
import { clickup } from "./integrations/clickup/client";

const { env } = getConfig();

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL
  }
});

app.get("/dev/clickup/teams", async () => {
  return clickup.getTeams();
});

app.get("/health", async () => {
  const payload = {
    ok: true,
    service: "onefocus-backend",
    ts: new Date().toISOString()
  };

  HealthResponseSchema.parse(payload);
  return payload;
});

await app.listen({ port: env.PORT, host: env.HOST });