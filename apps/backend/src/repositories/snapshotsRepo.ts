import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

export async function createSnapshot(input: {
  source: string;
  projectId?: string | null;
  raw: Prisma.InputJsonValue;
}) {
  return prisma.snapshot.create({
    data: {
      source: input.source,
      projectId: input.projectId ?? null,
      raw: input.raw,
    },
  });
}

export async function attachSnapshotTasks(input: {
  snapshotId: string;
  rows: Array<{
    taskId: string;
    status: string;
    dueDate?: Date | null;
    nominalEstimateMin?: number | null;
    tags: string[];
  }>;
}) {
  // createMany no soporta relaciones, pero SnapshotTask tiene snapshotId/taskId directos.
  // Usamos createMany con skipDuplicates para idempotencia del snapshot.
  return prisma.snapshotTask.createMany({
    data: input.rows.map((r) => ({
      snapshotId: input.snapshotId,
      taskId: r.taskId,
      status: r.status,
      dueDate: r.dueDate ?? null,
      nominalEstimateMin: r.nominalEstimateMin ?? null,
      tags: r.tags,
    })),
    skipDuplicates: true,
  });
}
