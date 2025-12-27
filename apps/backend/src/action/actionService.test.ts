import { describe, it, expect, vi, beforeEach } from "vitest";

// IMPORTANT: vi.mock is hoisted. Use vi.hoisted for any values referenced inside the factory.
const prismaMock = vi.hoisted(() => {
  return {
    actionProposed: {
      create: vi.fn(),
      update: vi.fn(),
    },
    actionExecuted: {
      create: vi.fn(),
    },
  };
});

vi.mock("../db/prisma", () => {
  return { prisma: prismaMock };
});

describe("actionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proposeAction creates ActionProposed with status PROPOSED", async () => {
    prismaMock.actionProposed.create.mockResolvedValue({ id: "p1" });

    const { proposeAction } = await import("./actionService");

    const res = await proposeAction({
      kind: "AUTO_SAFE",
      payload: { hello: "world" },
      projectId: null,
      taskId: null,
      reason: "test",
    });

    expect(prismaMock.actionProposed.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.actionProposed.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "AUTO_SAFE",
        status: "PROPOSED",
        payload: { hello: "world" },
        reason: "test",
      }),
    });
    expect(res).toEqual({ id: "p1" });
  });

  it("executeAction creates ActionExecuted EXECUTED and stores result when runner returns result", async () => {
    prismaMock.actionExecuted.create.mockResolvedValue({ id: "e1" });

    const { executeAction } = await import("./actionService");

    const res = await executeAction(
      "AUTO_SAFE",
      { proposedId: "p1", payload: { a: 1 } },
      async () => ({ result: { ok: true } })
    );

    expect(prismaMock.actionExecuted.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.actionExecuted.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        proposedId: "p1",
        status: "EXECUTED",
        payload: { a: 1 },
        error: null,
      }),
    });
    expect(res).toEqual({ id: "e1" });
  });

  it("autoSafeAction proposes then executes", async () => {
    prismaMock.actionProposed.create.mockResolvedValue({ id: "p1" });
    prismaMock.actionExecuted.create.mockResolvedValue({ id: "e1" });

    const { autoSafeAction } = await import("./actionService");

    const out = await autoSafeAction(
      "AUTO_SAFE",
      {
        payload: { x: 1 },
        projectId: null,
        taskId: null,
        reason: "r",
      },
      async () => ({ result: { done: true } })
    );

    expect(prismaMock.actionProposed.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.actionExecuted.create).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ proposed: { id: "p1" }, executed: { id: "e1" } });
  });
});
