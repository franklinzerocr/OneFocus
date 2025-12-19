import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // se usará a partir de la tarea DB
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // ClickUp
  CLICKUP_API_TOKEN: z.string().min(1, "CLICKUP_API_TOKEN is required"),
  CLICKUP_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.clickup.com/api/v2"),
  CLICKUP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(120000)
    .default(15000),
  CLICKUP_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0)
    .max(20)
    .default(5),
  CLICKUP_BACKOFF_BASE_MS: z.coerce
    .number()
    .int()
    .min(50)
    .max(60000)
    .default(300),
  CLICKUP_BACKOFF_MAX_MS: z.coerce
    .number()
    .int()
    .min(50)
    .max(120000)
    .default(6000),

});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    // Error legible + completo (sin ocultar claves)
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${message}`);
  }
  return parsed.data;
}
