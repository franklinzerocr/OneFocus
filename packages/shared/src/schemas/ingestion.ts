import { z } from "zod";

export const IngestedTaskSchema = z.object({
  externalId: z.string(),
  title: z.string(),
  status: z.string(),
  tags: z.array(z.string()).default([]),
  dueAt: z.string().datetime().nullable().default(null),
  nominalEstimateMin: z.number().int().positive().nullable().default(null),
});

export type IngestedTask = z.infer<typeof IngestedTaskSchema>;

export const IngestedProjectSchema = z.object({
  externalType: z.string(), // "list" for v1
  externalId: z.string(),
  name: z.string(),
  bucket: z.string().default("primary_work"),
});

export type IngestedProject = z.infer<typeof IngestedProjectSchema>;
