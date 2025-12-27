// apps/backend/src/action/actionService.ts
import { Prisma, type ActionKind } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { ExecuteActionInput, ProposeActionInput, ActionPayload } from "./types";

function toInputJson(value: unknown): ActionPayload {
  try {
    return JSON.parse(JSON.stringify(value)) as ActionPayload;
  } catch {
    return String(value) as unknown as ActionPayload;
  }
}

function errorToString(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function proposeAction(input: ProposeActionInput) {
  return prisma.actionProposed.create({
    data: {
      kind: input.kind,
      status: "PROPOSED",
      payload: input.payload,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      reason: input.reason ?? null,
    },
  });
}

export async function approveAction(proposedId: string, reason?: string | null) {
  return prisma.actionProposed.update({
    where: { id: proposedId },
    data: { status: "APPROVED", reason: reason ?? null },
  });
}

export async function rejectAction(proposedId: string, reason?: string | null) {
  return prisma.actionProposed.update({
    where: { id: proposedId },
    data: { status: "REJECTED", reason: reason ?? null },
  });
}

export async function executeAction(
  kind: ActionKind,
  input: Pick<ExecuteActionInput, "proposedId" | "payload">,
  runner: () => Promise<{ result?: unknown } | void>
) {
  try {
    const out = await runner();

    type RunnerResult = { result?: unknown };

    const maybeResult =
      out && typeof out === "object" && "result" in out
        ? (out as RunnerResult).result
        : undefined;

    return prisma.actionExecuted.create({
      data: {
        proposedId: input.proposedId ?? null,
        status: "EXECUTED",
        payload: input.payload,
        result: maybeResult === undefined ? Prisma.DbNull : toInputJson(maybeResult),
        error: null,
      },
    });
  } catch (e) {
    return prisma.actionExecuted.create({
      data: {
        proposedId: input.proposedId ?? null,
        status: "FAILED",
        payload: input.payload,
        result: Prisma.DbNull,
        error: errorToString(e),
      },
    });
  }
}

export async function autoSafeAction(
  kind: ActionKind,
  input: Omit<ProposeActionInput, "kind">,
  runner: () => Promise<{ result?: unknown } | void>
) {
  const proposed = await proposeAction({ ...input, kind });
  const executed = await executeAction(kind, { proposedId: proposed.id, payload: input.payload }, runner);
  return { proposed, executed };
}

export function requiresApproval(kind: ActionKind): boolean {
  return kind !== "AUTO_SAFE";
}
