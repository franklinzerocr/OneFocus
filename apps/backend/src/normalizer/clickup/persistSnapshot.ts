import { Prisma } from "@prisma/client";
import type { NormalizedClickUpSnapshot } from "@onefocus/shared";
import { upsertProject } from "../../repositories/projectsRepo";
import { upsertTask } from "../../repositories/tasksRepo";
import { createSnapshot, attachSnapshotTasks } from "../../repositories/snapshotsRepo";

/**
 * Persiste:
 * - Project (por list)
 * - Task (upsert por externalId)
 * - Snapshot con raw
 * - SnapshotTask rows (status/due/tags/estimate congelados)
 */
export async function persistClickUpSnapshot(n: NormalizedClickUpSnapshot) {
  const project = await upsertProject({
    externalType: n.project.externalType,
    externalId: n.project.externalId,
    name: n.project.name,
    bucket: n.project.bucket,
  });

  // upsert tasks + collect ids
  const taskRows = [];
  for (const t of n.tasks) {
    const internal = await upsertTask(
      {
        externalId: t.externalId,
        title: t.title,
        status: t.status,
        tags: t.tags,
        dueAt: t.dueAt ?? null,
        nominalEstimateMin: t.nominalEstimateMin ?? null,
      },
      project.id
    );

    taskRows.push({
      taskId: internal.id,
      status: t.status,
      dueDate: t.dueAt ? new Date(t.dueAt) : null,
      nominalEstimateMin: t.nominalEstimateMin ?? null,
      tags: t.tags,
    });
  }

  const snapshot = await createSnapshot({
    source: "clickup",
    projectId: project.id,
    raw: n.raw as Prisma.InputJsonValue,
  });

  await attachSnapshotTasks({
    snapshotId: snapshot.id,
    rows: taskRows,
  });

  return { projectId: project.id, snapshotId: snapshot.id, taskCount: taskRows.length };
}
