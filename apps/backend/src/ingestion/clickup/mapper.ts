import type { ClickUpTask } from "../../integrations/clickup/types";
import { IngestedTaskSchema } from "@onefocus/shared";

function msToIso(ms?: string | null) {
  if (!ms) return null;
  const n = Number(ms);
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}

function estimateMsToMinutes(ms?: number | null) {
  if (!ms || ms <= 0) return null;
  return Math.round(ms / 60000);
}

function normalizeStatus(status: ClickUpTask["status"]) {
  if (typeof status === "string") return status;
  return status.status;
}

export function mapClickUpTask(task: ClickUpTask) {
  const mapped = {
    externalId: task.id,
    title: task.name,
    status: normalizeStatus(task.status),
    tags: (task.tags ?? []).map((t) => t.name),
    dueAt: msToIso(task.due_date),
    nominalEstimateMin: estimateMsToMinutes(task.time_estimate),
  };

  return IngestedTaskSchema.parse(mapped);
}
