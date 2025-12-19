import { describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL);

describe("db", () => {
  it.runIf(hasDb)("connects and can run a simple query", async () => {
    const { prisma } = await import("./prisma");
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
    expect(result[0]?.now).toBeInstanceOf(Date);
  });
});
