// apps/backend/src/config/index.ts
import type { Env } from "./env";
import { loadEnv } from "./env";

export type AppConfig = {
  env: Env;
};

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) cached = { env: loadEnv() };
  return cached;
}

export function resetConfigForTests() {
  cached = null;
}
