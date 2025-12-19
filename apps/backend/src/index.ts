import Fastify from "fastify";
import { HealthResponseSchema } from "@onefocus/shared";
import { getConfig } from "./config";
import { clickup } from "./integrations/clickup/client";
import { syncClickUpList } from "./ingestion/clickup/syncList";

const { env } = getConfig();

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL
  }
});

app.post("/dev/ingest/clickup/list/:listId", async (req) => {
  const { listId } = req.params as { listId: string };
  const name = (req.query as { name?: string }).name ?? undefined;
  return syncClickUpList(listId, name);
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