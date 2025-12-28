// apps/backend/src/linking/issueTask/issueTaskLinkService.ts
import { getConfig } from "../../config";
import { prisma } from "../../db/prisma";
import { parseDueDateFromIssue } from "./issueParser";
import type { GithubIssueOpenedEvent } from "./types";
import { clickupCreateTask, clickupAddComment } from "../../integrations/clickup";
import { autoSafeAction } from "../../action/actionService";
import type { ActionKind } from "@prisma/client";

function must<T>(v: T | undefined | null, message: string): T {
  if (v === undefined || v === null || (typeof v === "string" && v.length === 0)) {
    throw new Error(message);
  }
  return v;
}

function endOfDayUtcMs(dateYmd: string): number {
  return new Date(`${dateYmd}T23:59:59.000Z`).getTime();
}

function toEndOfProjectDue(projectEndDate: string): number {
  return endOfDayUtcMs(projectEndDate);
}

export async function handleGithubIssueEvent(evt: GithubIssueOpenedEvent) {
  const cfg = getConfig();

  const repo = evt.repository.full_name;
  const issueNo = evt.issue.number;

  const existing = await prisma.issueTaskLink.findUnique({
    where: { githubRepo_githubIssueNo: { githubRepo: repo, githubIssueNo: issueNo } },
    select: { id: true },
  });
  if (existing) return { status: "already_linked" as const, linkId: existing.id };

  const projectEndDate = must(cfg.env.PROJECT_END_DATE, "PROJECT_END_DATE is required");
  const defaultListId = must(
    cfg.env.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID,
    "ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID is required"
  );

  // ✅ TS-safe fallback (fixes CI)
  const defaultEstimateMin = cfg.env.DEFAULT_TASK_ESTIMATE_MINUTES ?? 60;

  const dueStr = parseDueDateFromIssue(evt.issue.body);
  const dueMs = dueStr ? endOfDayUtcMs(dueStr) : toEndOfProjectDue(projectEndDate);

  const created = await clickupCreateTask(defaultListId, {
    name: `[GH#${issueNo}] ${evt.issue.title}`,
    description: `GitHub: ${evt.issue.html_url}\n\n${evt.issue.body ?? ""}`.trim(),
    due_date: dueMs,
    time_estimate: defaultEstimateMin * 60 * 1000,
  });

  const internalTask = await prisma.task.upsert({
    where: { externalId: created.id },
    create: {
      externalId: created.id,
      title: `[GH#${issueNo}] ${evt.issue.title}`,
      status: "OPEN",
      tags: ["github", "issue"],
      dueDate: new Date(dueMs),
    },
    update: {
      title: `[GH#${issueNo}] ${evt.issue.title}`,
      dueDate: new Date(dueMs),
    },
    select: { id: true },
  });

  const link = await prisma.issueTaskLink.create({
    data: {
      githubRepo: repo,
      githubIssueNo: issueNo,
      githubNodeId: evt.issue.node_id ?? null,
      githubIssueUrl: evt.issue.html_url,
      clickupTaskId: created.id,
      clickupListId: defaultListId,
      clickupTaskUrl: null,
      task: { connect: { id: internalTask.id } },
    },
    select: { id: true },
  });

  await clickupAddComment(created.id, `Linked GitHub issue: ${evt.issue.html_url}`);

  const kind: ActionKind = "AUTO_SAFE";
  const { proposed, executed } = await autoSafeAction(
    kind,
    {
      payload: {
        type: "ISSUE_TASK_LINK",
        github: { repo, issueNo, url: evt.issue.html_url },
        clickup: { listId: defaultListId, taskId: created.id },
        linkId: link.id,
      },
      taskId: internalTask.id,
      reason: "Auto-link GitHub issue to ClickUp task",
    },
    async () => ({ result: { linkId: link.id, clickupTaskId: created.id } })
  );

  return {
    status: "linked" as const,
    linkId: link.id,
    clickupTaskId: created.id,
    actionProposedId: proposed.id,
    actionExecutedId: executed.id,
  };
}
