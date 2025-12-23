import type { IngestedTask } from "@onefocus/shared";
import { getConfig } from "../../config";
import { parseDueDateFromIssue } from "./issueParser";
import type { GithubIssueOpenedEvent } from "./types";
import { clickupAddComment, clickupCreateTask } from "../../integrations/clickup";
import { prisma } from "../../db/prisma";
import { upsertTask } from "../../repositories/tasksRepo";

function endOfDayUtcMs(yyyyMmDd: string): number {
  return new Date(`${yyyyMmDd}T23:59:59.000Z`).getTime();
}

export async function handleGithubIssueEvent(evt: GithubIssueOpenedEvent) {
  const cfg = getConfig();

  const repo = evt.repository.full_name;
  const issueNo = evt.issue.number;

  // Idempotencia: si ya existe link, no recrear task
  const existing = await prisma.issueTaskLink.findUnique({
    where: {
      githubRepo_githubIssueNo: { githubRepo: repo, githubIssueNo: issueNo },
    },
  });
  if (existing) return { status: "already_linked" as const, linkId: existing.id };

  const dueStr = parseDueDateFromIssue(evt.issue.body);
  const dueMs = endOfDayUtcMs(dueStr ?? cfg.PROJECT_END_DATE);

  const created = await clickupCreateTask(cfg.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID, {
    name: `[GH#${issueNo}] ${evt.issue.title}`,
    description: `GitHub: ${evt.issue.html_url}\n\n${evt.issue.body ?? ""}`.trim(),
    due_date: dueMs,
    time_estimate: cfg.DEFAULT_TASK_ESTIMATE_MINUTES * 60_000,
  });

  // Upsert Task interno (dominio) usando el repo existente
  const ingested: IngestedTask = {
    externalId: created.id,
    title: created.name ?? `[GH#${issueNo}] ${evt.issue.title}`,
    status: "OPEN",
    tags: ["github", "issue"],
    dueAt: new Date(dueMs).toISOString(),
    nominalEstimateMin: cfg.DEFAULT_TASK_ESTIMATE_MINUTES,
  };

  const task = await upsertTask(ingested);

  // Persist link (ahora requiere taskId)
  const link = await prisma.issueTaskLink.create({
    data: {
      githubRepo: repo,
      githubIssueNo: issueNo,
      githubNodeId: evt.issue.node_id ?? null,
      githubIssueUrl: evt.issue.html_url,
      clickupTaskId: created.id,
      clickupListId: cfg.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID,
      clickupTaskUrl: null,
      taskId: task.id,
    },
  });

  // “Bidireccional” mínimo: comentar en ClickUp con link al issue
  await clickupAddComment(created.id, `Linked GitHub issue: ${evt.issue.html_url}`);

  return { status: "linked" as const, linkId: link.id, clickupTaskId: created.id };
}
