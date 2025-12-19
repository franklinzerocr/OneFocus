import Fastify from "fastify";
import { HealthResponseSchema } from "@onefocus/shared";
import { config } from "./config";
import { clickup } from "./integrations/clickup/client";

const app = Fastify({
  logger: {
    level: config.env.LOG_LEVEL
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

await app.listen({ port: config.env.PORT, host: config.env.HOST });
