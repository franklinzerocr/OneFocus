export type SnapshotSource = "clickup" | "github" | "system";

export type NormalizedProject = {
  externalType: "team" | "space" | "folder" | "list";
  externalId: string;
  name: string;
  bucket: "primary_work" | "primary_personal" | "everything_else";
};

export type NormalizedTask = {
  externalId: string; // ClickUp task id
  title: string;
  status: string;
  tags: string[];
  dueAt?: string | null; // ISO string
  nominalEstimateMin?: number | null;
};

export type NormalizedClickUpSnapshot = {
  source: "clickup";
  capturedAt: string; // ISO
  project: NormalizedProject;
  tasks: NormalizedTask[];
  raw: unknown; // raw payload for audit/replay
};
