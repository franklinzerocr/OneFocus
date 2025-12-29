import { PrismaClient } from "@prisma/client";
import type {
  ContextPack,
  ContextPackOptions,
  Bucket,
  ProjectSummary,
  RiskItem,
  SnapshotRef,
} from "./types";

const DUE_SOON_DAYS_DEFAULT = 7;

function iso(d: Date) {
  return d.toISOString();
}

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Returns Prisma where fragments based on bucket selection.
 * - bucketSel === "all" => no filter
 * - otherwise => filter by Project.bucket
 */
function bucketWhere(bucketSel: Bucket | "all") {
  return bucketSel === "all" ? {} : { bucket: bucketSel };
}

function snapshotBucketWhere(bucketSel: Bucket | "all") {
  return bucketSel === "all" ? {} : { project: { bucket: bucketSel } };
}

function snapshotRef(s: { id: string; capturedAt: Date; source: string }): SnapshotRef {
  return { id: s.id, capturedAt: s.capturedAt.toISOString(), source: s.source };
}

// Heurística v1: "closed" si status contiene done/closed/complete.
// (Esto es data-driven y ajustable más tarde con mapping real)
function isClosedStatus(status: string) {
  const x = status.toLowerCase();
  return x.includes("done") || x.includes("closed") || x.includes("complete");
}

type SnapshotAgg = {
  tasksOpen: number;
  tasksClosed: number;
  overdue: number;
  dueSoon: number;
  missingEstimate: number;
};

function aggEmpty(): SnapshotAgg {
  return { tasksOpen: 0, tasksClosed: 0, overdue: 0, dueSoon: 0, missingEstimate: 0 };
}

export async function buildContextPack(
  prisma: PrismaClient,
  opts?: ContextPackOptions
): Promise<ContextPack> {
  const now = opts?.now ?? new Date();
  const bucketSel: Bucket | "all" = opts?.bucket ?? "all";
  const dueSoonDays = DUE_SOON_DAYS_DEFAULT;

  const dueSoonCutoff = addDaysUTC(startOfDayUTC(now), dueSoonDays + 1); // exclusivo

  // 1) Latest snapshot por bucket (basado en Project.bucket)
  const latestSnapshot = await prisma.snapshot.findFirst({
    where: snapshotBucketWhere(bucketSel),
    orderBy: { capturedAt: "desc" },
    select: { id: true, capturedAt: true, source: true, projectId: true },
  });

  if (!latestSnapshot) {
    return {
      generatedAt: iso(now),
      bucket: bucketSel,
      latestSnapshot: null,
      previousSnapshot: null,
      projects: [],
      totals: { projects: 0, tasksOpen: 0, tasksClosed: 0, overdue: 0, dueSoon: 0, missingEstimate: 0 },
      deltas: { tasksOpenDelta: 0, overdueDelta: 0, dueSoonDelta: 0, missingEstimateDelta: 0 },
      risks: [{ code: "NO_SNAPSHOT", severity: "high", message: "No snapshots found for selected bucket." }],
      pf: null,
    };
  }

  // Previous snapshot: anterior al latest (por capturedAt)
  const previousSnapshot = await prisma.snapshot.findFirst({
    where: {
      ...snapshotBucketWhere(bucketSel),
      capturedAt: { lt: latestSnapshot.capturedAt },
    },
    orderBy: { capturedAt: "desc" },
    select: { id: true, capturedAt: true, source: true },
  });

  // 2) Projects relevantes (bucket)
  const projects = await prisma.project.findMany({
    where: bucketWhere(bucketSel),
    select: { id: true, name: true, bucket: true },
    orderBy: { updatedAt: "desc" },
  });

  if (projects.length === 0) {
    return {
      generatedAt: iso(now),
      bucket: bucketSel,
      latestSnapshot: snapshotRef(latestSnapshot),
      previousSnapshot: previousSnapshot ? snapshotRef(previousSnapshot) : null,
      projects: [],
      totals: { projects: 0, tasksOpen: 0, tasksClosed: 0, overdue: 0, dueSoon: 0, missingEstimate: 0 },
      deltas: { tasksOpenDelta: 0, overdueDelta: 0, dueSoonDelta: 0, missingEstimateDelta: 0 },
      risks: [{ code: "NO_PROJECTS", severity: "high", message: "No projects found for selected bucket." }],
      pf: null,
    };
  }

  const projectIds = projects.map((p) => p.id);

  // 3) Pull snapshotTasks para latest y previous
  const latestSnapshotTasks = await prisma.snapshotTask.findMany({
    where: {
      snapshotId: latestSnapshot.id,
      task: { projectId: { in: projectIds } },
    },
    select: {
      status: true,
      dueDate: true,
      nominalEstimateMin: true,
      task: { select: { projectId: true } },
    },
  });

  const prevSnapshotTasks = previousSnapshot
    ? await prisma.snapshotTask.findMany({
        where: {
          snapshotId: previousSnapshot.id,
          task: { projectId: { in: projectIds } },
        },
        select: {
          status: true,
          dueDate: true,
          nominalEstimateMin: true,
          task: { select: { projectId: true } },
        },
      })
    : [];

  // 4) Aggregation por proyecto y totals
  const latestByProject = new Map<string, SnapshotAgg>();
  const prevByProject = new Map<string, SnapshotAgg>();

  for (const p of projects) {
    latestByProject.set(p.id, aggEmpty());
    prevByProject.set(p.id, aggEmpty());
  }

  function apply(list: typeof latestSnapshotTasks, map: Map<string, SnapshotAgg>) {
    for (const st of list) {
      const pid = st.task.projectId;
      if (!pid) continue;
      const agg = map.get(pid);
      if (!agg) continue;

      const closed = isClosedStatus(st.status);
      if (closed) agg.tasksClosed += 1;
      else agg.tasksOpen += 1;

      const due = st.dueDate ? new Date(st.dueDate) : null;
      if (!closed && due) {
        if (due.getTime() < now.getTime()) agg.overdue += 1;
        if (due.getTime() < dueSoonCutoff.getTime()) agg.dueSoon += 1;
      }

      if (!st.nominalEstimateMin || st.nominalEstimateMin <= 0) {
        if (!closed) agg.missingEstimate += 1;
      }
    }
  }

  apply(latestSnapshotTasks, latestByProject);
  apply(prevSnapshotTasks, prevByProject);

  const projectSummaries: ProjectSummary[] = projects.map((p) => {
    const latestAgg = latestByProject.get(p.id) ?? aggEmpty();
    return {
      projectId: p.id,
      name: p.name,
      bucket: p.bucket as Bucket,
      tasksOpen: latestAgg.tasksOpen,
      tasksClosed: latestAgg.tasksClosed,
      overdue: latestAgg.overdue,
      dueSoon: latestAgg.dueSoon,
      missingEstimate: latestAgg.missingEstimate,
    };
  });

  const totalsLatest = projectSummaries.reduce(
    (acc, ps) => {
      acc.projects += 1;
      acc.tasksOpen += ps.tasksOpen;
      acc.tasksClosed += ps.tasksClosed;
      acc.overdue += ps.overdue;
      acc.dueSoon += ps.dueSoon;
      acc.missingEstimate += ps.missingEstimate;
      return acc;
    },
    { projects: 0, tasksOpen: 0, tasksClosed: 0, overdue: 0, dueSoon: 0, missingEstimate: 0 }
  );

  const totalsPrev = projects.reduce(
    (acc, p) => {
      const a = prevByProject.get(p.id) ?? aggEmpty();
      acc.tasksOpen += a.tasksOpen;
      acc.overdue += a.overdue;
      acc.dueSoon += a.dueSoon;
      acc.missingEstimate += a.missingEstimate;
      return acc;
    },
    { tasksOpen: 0, overdue: 0, dueSoon: 0, missingEstimate: 0 }
  );

  const deltas = {
    tasksOpenDelta: totalsLatest.tasksOpen - totalsPrev.tasksOpen,
    overdueDelta: totalsLatest.overdue - totalsPrev.overdue,
    dueSoonDelta: totalsLatest.dueSoon - totalsPrev.dueSoon,
    missingEstimateDelta: totalsLatest.missingEstimate - totalsPrev.missingEstimate,
  };

  // 5) Risks (solo reglas simples, determinísticas)
  const risks: RiskItem[] = [];

  if (deltas.overdueDelta > 0) {
    risks.push({
      code: "OVERDUE_INCREASING",
      severity: deltas.overdueDelta >= 5 ? "high" : "medium",
      message: `Overdue tasks increased by ${deltas.overdueDelta} vs previous snapshot.`,
    });
  }

  if (totalsLatest.missingEstimate >= 10) {
    risks.push({
      code: "MANY_MISSING_ESTIMATES",
      severity: totalsLatest.missingEstimate >= 25 ? "high" : "medium",
      message: `There are ${totalsLatest.missingEstimate} open tasks without a nominal estimate.`,
    });
  }

  if (deltas.dueSoonDelta > 0 && totalsLatest.dueSoon >= 10) {
    risks.push({
      code: "DUE_SOON_SPIKE",
      severity: totalsLatest.dueSoon >= 25 ? "high" : "medium",
      message: `Due-soon tasks are ${totalsLatest.dueSoon} (delta +${deltas.dueSoonDelta}).`,
    });
  }

  const lookback = opts?.lookbackReports ?? 5;

  // PF capsule (nullable si aún no hay metrics)
  const dayKey = startOfDayUTC(now);

  const todayMetric = await prisma.metricDaily.findUnique({
    where: { day: dayKey },
    select: {
      pfGlobal: true,
      pfByProject: true,
      pfByTag: true,
      pfByDow: true,
      sampleCounts: true,
      confidence: true,
      day: true,
    },
  });

  let pf: ContextPack["pf"] = null;

  if (todayMetric) {
    const recent = await prisma.metricDaily.findMany({
      orderBy: { day: "desc" },
      take: lookback,
      select: { day: true, pfGlobal: true },
    });

    const valuesDesc = recent.map((r) => ({ day: r.day.toISOString(), pfGlobal: r.pfGlobal ?? null }));
    const values = [...valuesDesc].reverse();

    const first = values[0]?.pfGlobal ?? null;
    const last = values[values.length - 1]?.pfGlobal ?? null;
    const deltaFromFirstToLast = first !== null && last !== null ? last - first : null;

    pf = {
      pfGlobal: todayMetric.pfGlobal ?? null,
      trendVsLastN: {
        lastN: values.length,
        values,
        deltaFromFirstToLast,
      },
      pfByProject: (todayMetric.pfByProject as unknown) ?? null,
      pfByTag: (todayMetric.pfByTag as unknown) ?? null,
      pfByDow: (todayMetric.pfByDow as unknown) ?? null,
      sampleCounts: (todayMetric.sampleCounts as unknown) ?? null,
      confidence: (todayMetric.confidence as unknown) ?? null,
    };
  }

  return {
    generatedAt: iso(now),
    bucket: bucketSel,
    latestSnapshot: snapshotRef(latestSnapshot),
    previousSnapshot: previousSnapshot ? snapshotRef(previousSnapshot) : null,
    projects: projectSummaries,
    totals: totalsLatest,
    deltas,
    risks,
    pf,
  };
}
