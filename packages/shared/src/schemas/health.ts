import { z } from "zod";

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  ts: z.string()
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
