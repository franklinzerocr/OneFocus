// apps/backend/src/normalizer/clickup/clickupNormalizer.ts
import type { NormalizedClickUpSnapshot, NormalizedTask } from "@onefocus/shared";

/**
 * Ajusta este mapper a tu payload real de ClickUp client.
 * Aquí asumimos que ya tienes "list" y "tasks" con campos típicos.
 */
export function normalizeClickUpListAndTasks(input: {
  list: { id: string; name: string };
  tasks: Array<{
    id: string;
    name: string;
    status?: { status?: string } | string;
    tags?: Array<{ name: string }> | string[];
    due_date?: string | number | null;
    time_estimate?: number | null; // ms
  }>;
  bucket?: "primary_work" | "primary_personal" | "everything_else";
  raw: unknown;
}): NormalizedClickUpSnapshot {
  const toStatus = (s: unknown): string => {
    if (!s) return "unknown";
    if (typeof s === "string") return s;
    if (typeof s === "object" && s && "status" in s) {
      const v = (s as { status?: unknown }).status;
      return typeof v === "string" ? v : "unknown";
    }
    return "unknown";
  };

  const toTags = (t: unknown): string[] => {
    if (!t) return [];
    if (Array.isArray(t)) {
      return t
        .map((x) => {
          if (typeof x === "string") return x;
          if (x && typeof x === "object" && "name" in x) {
            const n = (x as { name?: unknown }).name;
            return typeof n === "string" ? n : undefined;
          }
          return undefined;
        })
        .filter((x): x is string => typeof x === "string" && x.length > 0);
    }
    return [];
  };

  const toDueIso = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    // ClickUp suele mandar ms epoch como string
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    if (!Number.isFinite(n)) return null;
    return new Date(n).toISOString();
  };

  const tasks: NormalizedTask[] = input.tasks.map((t) => ({
    externalId: t.id,
    title: t.name,
    status: toStatus(t.status),
    tags: toTags(t.tags),
    dueAt: toDueIso(t.due_date),
    nominalEstimateMin: t.time_estimate ? Math.round(t.time_estimate / 60000) : null,
  }));

  return {
    source: "clickup",
    capturedAt: new Date().toISOString(),
    project: {
      externalType: "list",
      externalId: input.list.id,
      name: input.list.name,
      bucket: input.bucket ?? "everything_else",
    },
    tasks,
    raw: input.raw,
  };
}
