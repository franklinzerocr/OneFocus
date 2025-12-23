export type GithubIssueOpenedEvent = {
  action: "opened" | "reopened" | "edited" | string;
  repository: { full_name: string };
  issue: {
    number: number;
    title: string;
    body: string | null;
    html_url: string;
    node_id?: string;
  };
};
