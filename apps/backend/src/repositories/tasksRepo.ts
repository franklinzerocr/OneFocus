import { prisma } from "../db";
import type { IngestedTask } from "@onefocus/shared";

export async function upsertTask(task: IngestedTask, projectId?: string) {
  const baseData = {
    title: task.title,
    status: task.status,
    tags: task.tags,
    dueDate: task.dueAt ? new Date(task.dueAt) : null,
    nominalEstimateMin: task.nominalEstimateMin,
  };

  return prisma.task.upsert({
    where: { externalId: task.externalId },

    create: {
      externalId: task.externalId,
      ...baseData,
      ...(projectId
        ? { project: { connect: { id: projectId } } }
        : {}),
    },

    update: {
      ...baseData,
      ...(projectId
        ? { project: { connect: { id: projectId } } }
        : {}),
    },
  });
}
