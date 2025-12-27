import "dotenv/config";
import { z } from "zod";

function parseBool(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;

  const s = String(v).trim().toLowerCase();
  if (s === "" || s === "0" || s === "false" || s === "no" || s === "off") return false;
  if (s === "1" || s === "true" || s === "yes" || s === "on") return true;

  // fallback: si alguien pone basura, mejor fallar explícito
  throw new Error(`Invalid boolean value: ${String(v)}`);
}

const BaseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ClickUp client
  CLICKUP_API_TOKEN: z.string().min(1, "CLICKUP_API_TOKEN is required"),
  CLICKUP_API_BASE_URL: z.string().default("https://api.clickup.com/api/v2"),
  CLICKUP_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15000),
  CLICKUP_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  CLICKUP_BACKOFF_BASE_MS: z.coerce.number().int().min(1).default(100),
  CLICKUP_BACKOFF_MAX_MS: z.coerce.number().int().min(1).default(2000),

  // Webhooks
  WEBHOOKS_ENABLED: z.preprocess((v) => parseBool(v), z.boolean()).default(false),
  WEBHOOK_MAX_BODY_BYTES: z.coerce.number().int().min(1024).default(1024 * 1024),

  // Secrets (optional; enforced conditionally below)
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  CLICKUP_WEBHOOK_SECRET: z.string().optional(),

  // Issue↔Task Link Engine config (opcionales para no bloquear dev)
  PROJECT_END_DATE: z.string().optional(), // "YYYY-MM-DD"
  ISSUE_TASK_DEFAULT_CLICKUP_LIST_ID: z.string().optional(),
  DEFAULT_TASK_ESTIMATE_MINUTES: z.coerce.number().int().min(1).optional(),
});

export type Env = z.infer<typeof BaseSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = BaseSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }

  const env = parsed.data;

  // Enforce secrets only when webhooks are enabled
  if (env.WEBHOOKS_ENABLED) {
    const missing: string[] = [];
    if (!env.GITHUB_WEBHOOK_SECRET) missing.push("GITHUB_WEBHOOK_SECRET");
    // ClickUp "secret" HMAC estándar no existe; no lo exijas aquí.
    if (missing.length) {
      throw new Error(
        `Invalid environment variables:\n${missing.join(", ")}: Required when WEBHOOKS_ENABLED=true`
      );
    }
  }

  return env;
}
