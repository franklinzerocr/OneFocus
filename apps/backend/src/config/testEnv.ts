export function makeTestEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    PORT: "3000",
    HOST: "0.0.0.0",
    LOG_LEVEL: "info",

    DATABASE_URL: "postgresql://user:pass@localhost:5432/onefocus_test",
    CLICKUP_API_TOKEN: "test-clickup-token",

    GITHUB_WEBHOOK_SECRET: "test-gh-secret",
    CLICKUP_WEBHOOK_SECRET: "test-cu-secret",

    PROJECT_END_DATE: "2099-12-31",
    ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: "90123456789",
    DEFAULT_TASK_ESTIMATE_MINUTES: "60",

    ...overrides,
  };
}
