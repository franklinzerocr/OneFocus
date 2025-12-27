// apps/backend/src/normalizer/clickup/routes.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeClickUpListAndTasks } from "./clickupNormalizer";
import { persistClickUpSnapshot } from "./persistSnapshot";
import { clickupRequest } from "../../integrations/clickup/http";

const Params = z.object({
  listId: z.string().min(1),
});

const Body = z.object({
  bucket: z.enum(["primary_work", "primary_personal", "everything_else"]).optional(),
});

type ClickUpListResp = { id: string; name: string };

// Keep this loose but typed: we only read tasksResp.tasks and pass through.
// If you want stricter typing, replace unknown with the exact ClickUp task shape you support.
type ClickUpTasksResp = { tasks?: unknown[] };

export async function registerClickUpNormalizerRoutes(app: FastifyInstance) {
  app.post("/dev/clickup/list/:listId/snapshot", async (req, reply) => {
    const params = Params.parse(req.params);
    const body = Body.parse(req.body ?? {});

    // ClickUp API:
    // - GET /list/:listId
    // - GET /list/:listId/task  -> { tasks: [...] }
    const list = await clickupRequest<ClickUpListResp>("GET", `/list/${params.listId}`);
    const tasksResp = await clickupRequest<ClickUpTasksResp>("GET", `/list/${params.listId}/task`);

    const normalized = normalizeClickUpListAndTasks({
      list: { id: list.id, name: list.name },
      tasks: (tasksResp.tasks ?? []) as unknown as Array<{
        id: string;
        name: string;
        status?: { status?: string } | string;
        tags?: Array<{ name: string }> | string[];
        due_date?: string | number | null;
        time_estimate?: number | null;
      }>,
      raw: { list, tasks: tasksResp },
      ...(body.bucket ? { bucket: body.bucket } : {}),
    });

    const persisted = await persistClickUpSnapshot(normalized);
    return reply.code(200).send({ normalized: { taskCount: normalized.tasks.length }, persisted });
  });
}
