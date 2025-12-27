import { prisma } from "../db/prisma";

export async function upsertProject(input: {
  externalType: string;
  externalId: string;
  name: string;
  bucket: string;
}) {
  // externalId puede ser null, pero en tu schema está String? @unique y @@unique([externalType, externalId])
  // Para evitar null, exigimos string en input.

  return prisma.project.upsert({
    where: {
      externalType_externalId: {
        externalType: input.externalType,
        externalId: input.externalId,
      },
    },
    create: {
      externalType: input.externalType,
      externalId: input.externalId,
      name: input.name,
      bucket: input.bucket,
    },
    update: {
      name: input.name,
      bucket: input.bucket,
    },
  });
}
