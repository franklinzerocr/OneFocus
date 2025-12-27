import { describe, it, expect, vi, beforeEach } from "vitest";

type GithubIssueOpenedEvent = import("./types").GithubIssueOpenedEvent;

// hoisted mocks (Vitest hoists vi.mock calls)
const prismaMock = vi.hoisted(() => {
  return {
    issueTaskLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    task: {
      upsert: vi.fn(),
    },
    actionProposed: {
      create: vi.fn(),
      update: vi.fn(),
    },
    actionExecuted: {
      create: vi.fn(),
    },
  };
});

vi.mock("../../db/prisma", () => {
  return { prisma: prismaMock };
});

const getConfigMock = vi.hoisted(() => vi.fn());

vi.mock("../../config", () => {
  return { getConfig: getConfigMock };
});

const clickupCreateTaskMock = vi.hoisted(() => vi.fn());
const clickupAddCommentMock = vi.hoisted(() => vi.fn());

vi.mock("../../integrations/clickup", () => {
  return {
    clickupCreateTask: clickupCreateTaskMock,
    clickupAddComment: clickupAddCommentMock,
  };
});

// If your issue parser is used, keep it real. If you want deterministic behavior, mock it.
// Here we keep it real and feed a body without due date for deterministic path.
describe("handleGithubIssueEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getConfigMock.mockReturnValue({
      env: {
        PROJECT_END_DATE: "2099-12-31",
        ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: "90152086653",
        DEFAULT_TASK_ESTIMATE_MINUTES: 60,
      },
    });
  });

  function makeEvt(overrides?: Partial<GithubIssueOpenedEvent>): GithubIssueOpenedEvent {
    const base: GithubIssueOpenedEvent = {
      action: "opened",
      repository: { full_name: "owner/repo" },
      issue: {
        number: 123,
        title: "Test issue",
        body: "hello",
        html_url: "https://github.com/owner/repo/issues/123",
        node_id: "node_123",
      },
    };
    return { ...base, ...overrides };
  }

  it("creates ClickUp task and links GitHub issue", async () => {
    prismaMock.issueTaskLink.findUnique.mockResolvedValue(null);

    clickupCreateTaskMock.mockResolvedValue({ id: "cu_task_1" });
    clickupAddCommentMock.mockResolvedValue({ comment: { id: "c1" } });

    prismaMock.task.upsert.mockResolvedValue({ id: "task_internal_1" });
    prismaMock.issueTaskLink.create.mockResolvedValue({ id: "link_1" });

    prismaMock.actionProposed.create.mockResolvedValue({ id: "ap_1" });
    prismaMock.actionExecuted.create.mockResolvedValue({ id: "ae_1" });

    const { handleGithubIssueEvent } = await import("./issueTaskLinkService");

    const evt = makeEvt();
    const res = await handleGithubIssueEvent(evt);

    expect(clickupCreateTaskMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.task.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.issueTaskLink.create).toHaveBeenCalledTimes(1);
    expect(clickupAddCommentMock).toHaveBeenCalledTimes(1);

    expect(prismaMock.actionProposed.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.actionExecuted.create).toHaveBeenCalledTimes(1);

    expect(res).toEqual(
      expect.objectContaining({
        status: "linked",
        linkId: "link_1",
        clickupTaskId: "cu_task_1",
        actionProposedId: "ap_1",
        actionExecutedId: "ae_1",
      })
    );
  });

  it("creates link first time, skips second time (idempotent)", async () => {
    // 1st call: no existing
    prismaMock.issueTaskLink.findUnique
      .mockResolvedValueOnce(null)
      // 2nd call: existing link found
      .mockResolvedValueOnce({ id: "existing_link" });

    clickupCreateTaskMock.mockResolvedValue({ id: "cu_task_1" });
    clickupAddCommentMock.mockResolvedValue({ comment: { id: "c1" } });

    prismaMock.task.upsert.mockResolvedValue({ id: "task_internal_1" });
    prismaMock.issueTaskLink.create.mockResolvedValue({ id: "link_1" });

    prismaMock.actionProposed.create.mockResolvedValue({ id: "ap_1" });
    prismaMock.actionExecuted.create.mockResolvedValue({ id: "ae_1" });

    const { handleGithubIssueEvent } = await import("./issueTaskLinkService");

    const evt = makeEvt();

    const r1 = await handleGithubIssueEvent(evt);
    expect(r1.status).toBe("linked");

    const r2 = await handleGithubIssueEvent(evt);
    expect(r2).toEqual({ status: "already_linked", linkId: "existing_link" });

    // only first run should hit external side-effects
    expect(clickupCreateTaskMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.issueTaskLink.create).toHaveBeenCalledTimes(1);
    expect(clickupAddCommentMock).toHaveBeenCalledTimes(1);

    // action logs only for first
    expect(prismaMock.actionProposed.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.actionExecuted.create).toHaveBeenCalledTimes(1);
  });
});
