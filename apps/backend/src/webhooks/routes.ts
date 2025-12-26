// apps/backend/src/webhooks/routes.ts
import type { FastifyInstance } from "fastify";
import { getConfig } from "../config";
import { verifyGithubSignature } from "./signature";
import { insertWebhookEvent } from "../repositories/webhookEventsRepo";
import crypto from "node:crypto";

function must<T>(v: T | undefined | null, message: string): T {
  if (v === undefined || v === null || (typeof v === "string" && v.length === 0)) {
    throw new Error(message);
  }
  return v;
}

function header1(h: unknown): string | undefined {
  if (typeof h === "string") return h;
  if (Array.isArray(h) && typeof h[0] === "string") return h[0];
  return undefined;
}

export async function registerWebhookRoutes(app: FastifyInstance) {
  const { env } = getConfig();

  app.post("/webhooks/github", async (req, reply) => {
    if (!env.WEBHOOKS_ENABLED) return reply.code(404).send({ ok: false });

    const body = req.body as Buffer;
    const sig = req.headers["x-hub-signature-256"];
    const deliveryId = header1(req.headers["x-github-delivery"]) ?? "missing-delivery";
    const eventType = header1(req.headers["x-github-event"]) ?? "unknown";

    const signatureValid = verifyGithubSignature({
      secret: must(env.GITHUB_WEBHOOK_SECRET, "GITHUB_WEBHOOK_SECRET is required when WEBHOOKS_ENABLED=true"),
      body,
      signatureHeader: sig,
    });

    const payloadJson = safeJsonParse(body);

    const evt = await insertWebhookEvent({
      source: "github",
      deliveryId,
      eventType,
      signatureValid,
      payloadJson,
    });

    if (!signatureValid) return reply.code(401).send({ ok: false });

    return reply.code(202).send({ ok: true, id: evt.id });
  });

  app.post("/webhooks/clickup", async (req, reply) => {
    if (!env.WEBHOOKS_ENABLED) return reply.code(404).send({ ok: false });

    const body = req.body as Buffer;

    const deliveryId =
      header1(req.headers["x-clickup-delivery-id"]) ??
      header1(req.headers["x-webhook-id"]) ??
      hashBody(body);

    const eventType = header1(req.headers["x-clickup-event"]) ?? "unknown";

    function isLikelyClickUpPayload(payload: unknown): boolean {
      if (!payload || typeof payload !== "object") return false;
      const p = payload as Record<string, unknown>;
      return typeof p.event === "string" && typeof p.task_id === "string";
    }

    const payloadJson = safeJsonParse(body);

    // Nota: aquí aún NO validas firma real; solo “shape-check”. (mantenido tal cual tu intención)
    const signatureValid = isLikelyClickUpPayload(payloadJson);

    const evt = await insertWebhookEvent({
      source: "clickup",
      deliveryId,
      eventType,
      signatureValid,
      payloadJson,
    });

    if (!signatureValid) return reply.code(401).send({ ok: false });

    return reply.code(202).send({ ok: true, id: evt.id });
  });
}

function safeJsonParse(body: Buffer) {
  try {
    return JSON.parse(body.toString("utf-8"));
  } catch {
    return { raw: body.toString("utf-8") };
  }
}

function hashBody(body: Buffer) {
  return crypto.createHash("sha256").update(body).digest("hex");
}
