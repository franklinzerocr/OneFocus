import type { Env } from "./env";
import { loadEnv } from "./env";

export type AppConfig = {
  env: Env;

  // Issue ↔ Task Link Engine
  PROJECT_END_DATE: string;
  ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: string;
  DEFAULT_TASK_ESTIMATE_MINUTES: number;
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const env = loadEnv();

  cached = {
    env,

    PROJECT_END_DATE: env.PROJECT_END_DATE,
    ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: env.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID,
    DEFAULT_TASK_ESTIMATE_MINUTES: env.DEFAULT_TASK_ESTIMATE_MINUTES,
  };

  return cached;
}

// útil para tests (si cambias process.env)
export function resetConfigForTests() {
  cached = null;
}
