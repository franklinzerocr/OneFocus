import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * No `any` to satisfy @typescript-eslint/no-explicit-any
 * Keep the event shape minimal: only fields that the service reads.
 */

type RepoShape = { full_name: string };

type IssueShape = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  node_id: string;
};


type GithubIssueOpenedEventLike = {
  action: "opened";
  repository: RepoShape;
  issue: IssueShape;
};


const prismaMock = {
  issueTaskLink: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  task: {
    upsert: vi.fn(),
  },
};

const clickupCreateTaskMock = vi.fn();
const clickupAddCommentMock = vi.fn();

vi.mock("../../db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("../../config", () => ({
  getConfig: () => ({
    env: {
      PROJECT_END_DATE: "2099-12-31",
      ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: "list-123",
      DEFAULT_TASK_ESTIMATE_MINUTES: 60,
    },
  }),
}));

vi.mock("../../integrations/clickup", () => ({
  clickupCreateTask: clickupCreateTaskMock,
  clickupAddComment: clickupAddCommentMock,
}));

function mkEvt(
  overrides?: Partial<GithubIssueOpenedEventLike>
): GithubIssueOpenedEventLike {
  const base: GithubIssueOpenedEventLike = {
    action: "opened",
    repository: { full_name: "repo/name" },
    issue: {
      number: 42,
      title: "Bug",
      body: null,
      html_url: "https://github.com/repo/name/issues/42",
      node_id: "node-1",
    },
  };


  return {
    ...base,
    ...overrides,
    repository: {
      ...base.repository,
      ...(overrides?.repository ?? {}),
    },
    issue: {
      ...base.issue,
      ...(overrides?.issue ?? {}),
    },
  };
}

describe("handleGithubIssueEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates ClickUp task and links GitHub issue", async () => {
    prismaMock.issueTaskLink.findUnique.mockResolvedValue(null);
    clickupCreateTaskMock.mockResolvedValue({ id: "clickup-task-1" });
    prismaMock.task.upsert.mockResolvedValue({ id: "internal-task-1" });
    prismaMock.issueTaskLink.create.mockResolvedValue({ id: "link-1" });

    const { handleGithubIssueEvent } = await import("./issueTaskLinkService");

    const res = await handleGithubIssueEvent(mkEvt());

    expect(res.status).toBe("linked");
    expect(clickupCreateTaskMock).toHaveBeenCalledTimes(1);
    expect(clickupAddCommentMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.issueTaskLink.create).toHaveBeenCalledTimes(1);
  });

  it("creates link first time, skips second time (idempotent)", async () => {
    prismaMock.issueTaskLink.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "link-1" });

    clickupCreateTaskMock.mockResolvedValue({ id: "clickup-task-1" });
    prismaMock.task.upsert.mockResolvedValue({ id: "internal-task-1" });
    prismaMock.issueTaskLink.create.mockResolvedValue({ id: "link-1" });

    const { handleGithubIssueEvent } = await import("./issueTaskLinkService");

    const r1 = await handleGithubIssueEvent(mkEvt());
    expect(r1.status).toBe("linked");

    const r2 = await handleGithubIssueEvent(mkEvt());
    expect(r2.status).toBe("already_linked");

    expect(clickupCreateTaskMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.issueTaskLink.create).toHaveBeenCalledTimes(1);
  });
});
