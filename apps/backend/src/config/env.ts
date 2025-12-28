import "dotenv/config";
import { z } from "zod";

const boolFromString = z
  .string()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

const intFromString = z.coerce.number().int();

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    PORT: intFromString.min(1).max(65535).default(3000),
    HOST: z.string().default("0.0.0.0"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    DATABASE_URL: z.string().optional(),

    // ClickUp client
    CLICKUP_API_TOKEN: z.string().optional(),
    CLICKUP_API_BASE_URL: z.string().default("https://api.clickup.com/api/v2"),
    CLICKUP_TIMEOUT_MS: intFromString.default(15000),
    CLICKUP_MAX_RETRIES: intFromString.default(2),
    CLICKUP_BACKOFF_BASE_MS: intFromString.default(200),
    CLICKUP_BACKOFF_MAX_MS: intFromString.default(2000),

    // Webhooks ingestion
    WEBHOOKS_ENABLED: boolFromString.default("true"),
    WEBHOOK_MAX_BODY_BYTES: intFromString.default(1048576),

    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    CLICKUP_WEBHOOK_SECRET: z.string().optional(),

    // Issue ↔ Task Link Engine
    PROJECT_END_DATE: z.string().optional(), // "YYYY-MM-DD"
    ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: z.string().optional(),
    DEFAULT_TASK_ESTIMATE_MINUTES: intFromString.default(60),

    // Workspace snapshot / crawler
    CLICKUP_WORKSPACE_ID: z.string().optional(),
    SNAPSHOT_CONCURRENCY: intFromString.default(4),

    // Snapshot cron
    SNAPSHOT_CRON_ENABLED: boolFromString.default("false"),
    SNAPSHOT_CRON_TZ: z.string().default("Europe/Paris"),
    SNAPSHOT_CRON_TIME: z.string().default("19:00"),
  })
  .superRefine((env, ctx) => {
    const requireIn = (key: keyof typeof env, when: Array<typeof env.NODE_ENV>) => {
      if (when.includes(env.NODE_ENV) && (!env[key] || String(env[key]).length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Required",
        });
      }
    };

    if (env.NODE_ENV === "test") {
      if (!env.DATABASE_URL) env.DATABASE_URL = "postgresql://user:pass@localhost:5432/onefocus_test";
      if (!env.CLICKUP_API_TOKEN) env.CLICKUP_API_TOKEN = "test-token";
      if (!env.GITHUB_WEBHOOK_SECRET) env.GITHUB_WEBHOOK_SECRET = "test-secret";
      if (!env.CLICKUP_WEBHOOK_SECRET) env.CLICKUP_WEBHOOK_SECRET = "test-secret";
      if (!env.PROJECT_END_DATE) env.PROJECT_END_DATE = "2099-12-31";
      if (!env.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID) env.ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID = "90152086653";
      if (!env.CLICKUP_WORKSPACE_ID) env.CLICKUP_WORKSPACE_ID = "90152086653";
      return;
    }

    requireIn("DATABASE_URL", ["development", "production"]);
    requireIn("CLICKUP_API_TOKEN", ["development", "production"]);

    if (env.WEBHOOKS_ENABLED) {
      requireIn("GITHUB_WEBHOOK_SECRET", ["development", "production"]);
      requireIn("CLICKUP_WEBHOOK_SECRET", ["development", "production"]);
    }

    requireIn("PROJECT_END_DATE", ["development", "production"]);
    requireIn("ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID", ["development", "production"]);

    // Required for workspace snapshot endpoints/cron
    requireIn("CLICKUP_WORKSPACE_ID", ["development", "production"]);
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}
