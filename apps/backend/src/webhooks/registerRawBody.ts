import type { FastifyInstance, FastifyRequest } from "fastify";
import { getConfig } from "../config";

export function registerRawBody(app: FastifyInstance) {
  const { env } = getConfig();

  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: env.WEBHOOK_MAX_BODY_BYTES },
    async (_req: FastifyRequest, body: Buffer) => body,
  );
}
