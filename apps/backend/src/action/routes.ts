import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { approveAction, rejectAction } from "./actionService";

const BodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function registerActionRoutes(app: FastifyInstance) {
  app.post("/actions/:id/approve", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = BodySchema.parse(req.body ?? {});
    const updated = await approveAction(params.id, body.reason ?? null);
    return reply.code(200).send(updated);
  });

  app.post("/actions/:id/reject", async (req, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = BodySchema.parse(req.body ?? {});
    const updated = await rejectAction(params.id, body.reason ?? null);
    return reply.code(200).send(updated);
  });
}
