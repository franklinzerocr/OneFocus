import type { FastifyInstance } from "fastify";
import { getConfig } from "../config";
import { verifyGithubSignature } from "./signature";
import { insertWebhookEvent } from "../repositories/webhookEventsRepo";

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
      secret: env.GITHUB_WEBHOOK_SECRET,
      body,
      signatureHeader: sig,
    });

    // If signature invalid: store anyway (audit) but respond 401 to prevent processing.
    const payloadJson = safeJsonParse(body);

    const evt = await insertWebhookEvent({
      source: "github",
      deliveryId,
      eventType,
      signatureValid,
      payloadJson,
    });

    if (!signatureValid) return reply.code(401).send({ ok: false });

    // v1: accept fast, processing comes next task(s)
    return reply.code(202).send({ ok: true, id: evt.id });
  });

  app.post("/webhooks/clickup", async (req, reply) => {
    if (!env.WEBHOOKS_ENABLED) return reply.code(404).send({ ok: false });

    const body = req.body as Buffer;

    // ClickUp: delivery/event identifiers depend on their webhook implementation.
    // We'll use these defaults and refine once you show actual headers.
    const deliveryId =
      header1(req.headers["x-clickup-delivery-id"]) ??
      header1(req.headers["x-webhook-id"]) ??
      // fallback: deterministic hash for idempotency if ClickUp doesn't send an id
      hashBody(body);

    const eventType = header1(req.headers["x-clickup-event"]) ?? "unknown";


    function isLikelyClickUpPayload(payload: unknown): boolean {
      if (!payload || typeof payload !== "object") return false;
      const p = payload as Record<string, unknown>;
      return (
        typeof p.event === "string" &&
        typeof p.task_id === "string"
      );
    }


    const payloadJson = safeJsonParse(body);
    
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

import crypto from "node:crypto";
function hashBody(body: Buffer) {
  return crypto.createHash("sha256").update(body).digest("hex");
}
