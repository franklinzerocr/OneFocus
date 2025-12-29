import type { FastifyInstance } from "fastify";
import { buildContextPack } from "../core/contextPackager";
import { prisma } from "../db/prisma";

type Bucket = "primary_work" | "primary_personal" | "everything_else";

const BUCKETS = new Set<Bucket>([
  "primary_work",
  "primary_personal",
  "everything_else",
]);

export async function contextPackRoutes(app: FastifyInstance) {
  app.get("/context-pack", async (req, reply) => {
    const q = req.query as { bucket?: string; lookback?: string };

    const bucket: Bucket | undefined =
      q.bucket && BUCKETS.has(q.bucket as Bucket)
        ? (q.bucket as Bucket)
        : undefined;

    const lookbackParsed =
      q.lookback !== undefined ? Number(q.lookback) : undefined;

    const options = {
      ...(bucket !== undefined ? { bucket } : {}),
      ...(Number.isFinite(lookbackParsed)
        ? { lookbackReports: lookbackParsed as number }
        : {}),
    };

    const pack = await buildContextPack(prisma, options);

    return reply.send(pack);
  });
}
