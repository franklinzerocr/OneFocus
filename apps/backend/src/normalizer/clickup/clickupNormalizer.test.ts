// apps/backend/src/normalizer/clickup/clickupNormalizer.test.ts
import { describe, expect, it } from "vitest";
import { normalizeClickUpListAndTasks } from "./clickupNormalizer";

describe("normalizeClickUpListAndTasks", () => {
  it("maps list/tasks to normalized snapshot", () => {
    const n = normalizeClickUpListAndTasks({
      list: { id: "L1", name: "List 1" },
      tasks: [
        {
          id: "T1",
          name: "Task 1",
          status: { status: "open" },
          tags: [{ name: "a" }, { name: "b" }],
          due_date: String(Date.now()),
          time_estimate: 30 * 60 * 1000,
        },
      ],
      raw: { ok: true },
      bucket: "primary_work",
    });

    expect(n.project.externalId).toBe("L1");
    expect(n.tasks).toHaveLength(1);

    const t0 = n.tasks[0];
    expect(t0).toBeDefined();
    if (!t0) throw new Error("Expected first task to exist");

    expect(t0.nominalEstimateMin).toBe(30);
  });
});
