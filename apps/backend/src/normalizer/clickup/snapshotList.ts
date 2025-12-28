// apps/backend/src/normalizer/clickup/snapshotList.ts
import { normalizeClickUpListAndTasks } from "./clickupNormalizer";
import { persistClickUpSnapshot } from "./persistSnapshot";
import { getList, getTasks } from "../../integrations/clickup/client";

type ClickUpTaskLite = {
  id: string;
  name: string;
  status?: { status?: string } | string;
  tags?: Array<{ name: string }> | string[]; // clickup actual: Array<{name: string}>
  due_date?: string | number | null;
  time_estimate?: number | null;
};

function toTaskLiteArray(input: unknown): ClickUpTaskLite[] {
  if (!Array.isArray(input)) return [];

  return input
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

function unwrapTasks(tasksRaw: unknown): unknown[] {
  // supports either: {tasks:[...]} or [...]
  if (Array.isArray(tasksRaw)) return tasksRaw;
  if (tasksRaw && typeof tasksRaw === "object") {
    const o = tasksRaw as Record<string, unknown>;
    if (Array.isArray(o.tasks)) return o.tasks as unknown[];
  }
  return [];
}

export async function snapshotList(
  listId: string,
  opts?: { bucket?: "primary_work" | "primary_personal" | "everything_else" }
) {
  const list = await getList(listId);
  const tasksRaw = await getTasks(listId);

  const tasksArray = unwrapTasks(tasksRaw);
  const tasks = toTaskLiteArray(tasksArray);

  const normalized = normalizeClickUpListAndTasks({
    list: { id: list.id, name: list.name },
    tasks,
    raw: { list, tasks: tasksRaw },
    ...(opts?.bucket !== undefined ? { bucket: opts.bucket } : {}),
  });

  const persisted = await persistClickUpSnapshot(normalized);
  return { normalized, persisted };
}
