import { prisma } from "../db";
import type { IngestedProject } from "@onefocus/shared";

export async function upsertProject(p: IngestedProject) {
  return prisma.project.upsert({
    where: { externalType_externalId: { externalType: p.externalType, externalId: p.externalId } },
    create: {
      externalType: p.externalType,
      externalId: p.externalId,
      name: p.name,
      bucket: p.bucket,
    },
    update: {
      name: p.name,
      bucket: p.bucket,
    },
  });
}
