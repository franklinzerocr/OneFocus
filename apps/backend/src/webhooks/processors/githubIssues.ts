import type { GithubIssueOpenedEvent } from "../../linking/issueTask/types";
import { handleGithubIssueEvent } from "../../linking/issueTask/issueTaskLinkService";

export async function processGithubIssuesEvent(payload: unknown) {
  const evt = payload as GithubIssueOpenedEvent;
  if (!evt?.issue?.number || !evt?.repository?.full_name) return;
  if (evt.action !== "opened" && evt.action !== "reopened") return;

  await handleGithubIssueEvent(evt);
}
