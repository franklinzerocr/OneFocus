import type { ActionKind, ActionStatus, Prisma } from "@prisma/client";

/**
 * Prisma create/update para campos Json usa InputJsonValue (NO JsonValue).
 * Además, `payload` en tu schema NO es nullable, así que no aceptamos null aquí.
 */
export type ActionPayload = Prisma.InputJsonValue;

export type ProposeActionInput = {
  kind: ActionKind;
  payload: ActionPayload;
  projectId?: string | null;
  taskId?: string | null;
  reason?: string | null;
};

export type ExecuteActionInput = {
  proposedId?: string | null;
  payload: ActionPayload;
  result?: ActionPayload; // si no hay, lo guardamos como DbNull
  error?: string | null;
  status?: Extract<ActionStatus, "EXECUTED" | "FAILED" | "CANCELED">;
};
