export type Bucket = "primary_work" | "primary_personal" | "everything_else";

export type ContextPackOptions = {
  bucket?: Bucket;
  lookbackReports?: number; // para trend PF (default 5)
  now?: Date; // inyectable para test
};

export type PFTrend = {
  lastN: number;
  values: Array<{ day: string; pfGlobal: number | null }>;
  deltaFromFirstToLast: number | null;
};

export type PFCapsule = {
  pfGlobal: number | null;
  trendVsLastN: PFTrend | null;
  pfByProject: unknown | null;
  pfByTag: unknown | null;
  pfByDow: unknown | null;
  sampleCounts: unknown | null;
  confidence: unknown | null;
};

export type SnapshotRef = {
  id: string;
  capturedAt: string;
  source: string;
};

export type ProjectSummary = {
  projectId: string;
  name: string;
  bucket: Bucket;
  tasksOpen: number;
  tasksClosed: number;
  overdue: number;
  dueSoon: number; // próximos X días
  missingEstimate: number; // sin nominal estimate
};

export type DeltaCounters = {
  tasksOpenDelta: number;
  overdueDelta: number;
  dueSoonDelta: number;
  missingEstimateDelta: number;
};

export type RiskItem = {
  code:
    | "OVERDUE_INCREASING"
    | "MANY_MISSING_ESTIMATES"
    | "DUE_SOON_SPIKE"
    | "NO_SNAPSHOT"
    | "NO_PROJECTS";
  severity: "low" | "medium" | "high";
  message: string;
  projectId?: string;
};

export type ContextPack = {
  generatedAt: string;
  bucket: Bucket | "all";
  latestSnapshot: SnapshotRef | null;
  previousSnapshot: SnapshotRef | null;

  projects: ProjectSummary[];
  totals: {
    projects: number;
    tasksOpen: number;
    tasksClosed: number;
    overdue: number;
    dueSoon: number;
    missingEstimate: number;
  };

  deltas: {
    tasksOpenDelta: number;
    overdueDelta: number;
    dueSoonDelta: number;
    missingEstimateDelta: number;
  };

  risks: RiskItem[];

  pf: PFCapsule | null;
};
