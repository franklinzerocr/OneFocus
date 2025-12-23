import { prisma } from "../db/prisma";

export function findIssueTaskLinkByGithub(repo: string, issueNo: number) {
  return prisma.issueTaskLink.findUnique({
    where: {
      githubRepo_githubIssueNo: { githubRepo: repo, githubIssueNo: issueNo },
    },
  });
}

export function createIssueTaskLink(data: {
  githubRepo: string;
  githubIssueNo: number;
  githubNodeId: string | null;
  githubIssueUrl: string;
  clickupTaskId: string;
  clickupListId: string;
  clickupTaskUrl: string | null;
  taskId: string;
}) {
  return prisma.issueTaskLink.create({
    data: {
      githubRepo: data.githubRepo,
      githubIssueNo: data.githubIssueNo,
      githubNodeId: data.githubNodeId,
      githubIssueUrl: data.githubIssueUrl,
      clickupTaskId: data.clickupTaskId,
      clickupListId: data.clickupListId,
      clickupTaskUrl: data.clickupTaskUrl,
      taskId: data.taskId,
    },
  });
}
