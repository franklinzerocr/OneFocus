import { prisma } from "../db";
import type { Prisma } from "@prisma/client";


export async function insertWebhookEvent(opts: {
  source: "github" | "clickup";
  deliveryId: string;
  eventType: string;
  signatureValid: boolean;
  payloadJson: Prisma.InputJsonValue;
}) {
  // idempotent insert using unique(source, deliveryId)
  return prisma.webhookEvent.upsert({
    where: {
      source_deliveryId: {
        source: opts.source,
        deliveryId: opts.deliveryId,
      },
    },
    create: {
      source: opts.source,
      deliveryId: opts.deliveryId,
      eventType: opts.eventType,
      signatureValid: opts.signatureValid,
      payloadJson: opts.payloadJson,
      status: "RECEIVED",
    },
    update: {
      // If duplicate delivery, do not overwrite payload by default.
      // We only ensure signatureValid reflects latest verification.
      signatureValid: opts.signatureValid,
    },
  });
}

export async function markWebhookProcessed(id: string) {
  return prisma.webhookEvent.update({
    where: { id },
    data: { status: "PROCESSED", error: null },
  });
}

export async function markWebhookFailed(id: string, error: string) {
  return prisma.webhookEvent.update({
    where: { id },
    data: { status: "FAILED", error },
  });
}
