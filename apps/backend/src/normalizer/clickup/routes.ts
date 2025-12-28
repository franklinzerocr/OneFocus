// apps/backend/src/normalizer/clickup/routes.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { normalizeClickUpListAndTasks } from "./clickupNormalizer";
import { persistClickUpSnapshot } from "./persistSnapshot";
import { getList, getTasks } from "../../integrations/clickup/client";
import { snapshotWorkspaceFromSpaces } from "./crawler";
import { snapshotList } from "./snapshotList";

const Params = z.object({
  listId: z.string().min(1),
});

const Body = z.object({
  bucket: z.enum(["primary_work", "primary_personal", "everything_else"]).optional(),
});

type ClickUpTaskLite = {
  id: string;
  name: string;
  status?: { status?: string } | string;
  tags?: Array<{ name: string }> | string[];
  due_date?: string | number | null;
  time_estimate?: number | null;
};

function extractTasksArray(tasksRaw: unknown): unknown[] {
  // Some clients return an array already
  if (Array.isArray(tasksRaw)) return tasksRaw;

  // ClickUp commonly returns { tasks: [...] }
  if (tasksRaw && typeof tasksRaw === "object") {
    const o = tasksRaw as Record<string, unknown>;
    if (Array.isArray(o.tasks)) return o.tasks;
  }

  return [];
}

function toTaskLiteArray(input: unknown): ClickUpTaskLite[] {
  const arr = extractTasksArray(input);

  return arr
    .map((t): ClickUpTaskLite | null => {
      if (!t || typeof t !== "object") return null;
      const o = t as Record<string, unknown>;

      const id = typeof o.id === "string" ? o.id : null;
      const name = typeof o.name === "string" ? o.name : null;
      if (!id || !name) return null;

      const status = o.status as ClickUpTaskLite["status"];
      const tags = o.tags as ClickUpTaskLite["tags"];
      const due_date = o.due_date as ClickUpTaskLite["due_date"];
      const time_estimate = o.time_estimate as ClickUpTaskLite["time_estimate"];

      // exactOptionalPropertyTypes: don't set optional props to undefined; omit them.
      return {
        id,
        name,
        ...(status !== undefined ? { status } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(due_date !== undefined ? { due_date } : {}),
        ...(time_estimate !== undefined ? { time_estimate } : {}),
      };
    })
    .filter((x): x is ClickUpTaskLite => x !== null);
}

export async function registerClickUpNormalizerRoutes(app: FastifyInstance) {
  app.post("/dev/clickup/list/:listId/snapshot", async (req, reply) => {
    const params = Params.parse(req.params);
    const body = Body.parse(req.body ?? {});

    const list = await getList(params.listId);

    const tasksRaw = await getTasks(params.listId);
    const tasks = toTaskLiteArray(tasksRaw);

    const normalized = normalizeClickUpListAndTasks({
      list: { id: list.id, name: list.name },
      tasks,
      raw: { list, tasks: tasksRaw },
      ...(body.bucket !== undefined ? { bucket: body.bucket } : {}),
    });

    const persisted = await persistClickUpSnapshot(normalized);

    return reply
      .code(200)
      .send({ normalized: { taskCount: normalized.tasks.length }, persisted });
  });

  app.post("/dev/clickup/workspace/snapshot", async (_req, reply) => {
    const result = await snapshotWorkspaceFromSpaces(async (listId) => {
      await snapshotList(listId);
    });

    return reply.send(result);
  });
}
