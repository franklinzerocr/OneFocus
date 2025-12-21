import Fastify from "fastify";
import { HealthResponseSchema } from "@onefocus/shared";
import { getConfig } from "./config";
import { clickup } from "./integrations/clickup/client";
import { syncClickUpList } from "./ingestion/clickup/syncList";
import type { ClickUpTaskUpdateInput } from "./integrations/clickup/endpoints/taskUpdate";
import type { ClickUpCreateTaskInput } from "./integrations/clickup/types";
import { registerRawBody } from "./webhooks/registerRawBody";
import { registerWebhookRoutes } from "./webhooks/routes";


const { env } = getConfig();

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL
  }
});

await app.register(async (scoped) => {
  registerRawBody(scoped);
  await registerWebhookRoutes(scoped);
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




app.patch("/dev/clickup/task/:taskId", async (req) => {
  const { taskId } = req.params as { taskId: string };
  const body = req.body as ClickUpTaskUpdateInput;
  return clickup.updateTask(taskId, body);
});

app.post("/dev/clickup/list/:listId/task", async (req) => {
  const { listId } = req.params as { listId: string };
  const body = req.body as ClickUpCreateTaskInput;
  return clickup.createTask(listId, body);
});

app.post("/dev/clickup/task/:taskId/comment", async (req) => {
  const { taskId } = req.params as { taskId: string };
  const body = req.body as { comment_text: string };
  return clickup.addTaskComment(taskId, body.comment_text);
});



await app.listen({ port: env.PORT, host: env.HOST });