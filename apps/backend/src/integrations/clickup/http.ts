// apps/backend/src/integrations/clickup/http.ts
import { request } from "undici";
import { getConfig } from "../../config";
import { createClickUpHttp } from "./httpFactory";

function must<T>(v: T | undefined | null, message: string): T {
  if (v === undefined || v === null || (typeof v === "string" && v.length === 0)) {
    throw new Error(message);
  }
  return v;
}

export const { clickupRequest } = createClickUpHttp({
  getEnv: () => {
    const { env } = getConfig();
    return {
      CLICKUP_API_TOKEN: must(env.CLICKUP_API_TOKEN, "CLICKUP_API_TOKEN is required"),
      CLICKUP_API_BASE_URL: env.CLICKUP_API_BASE_URL,
      CLICKUP_TIMEOUT_MS: env.CLICKUP_TIMEOUT_MS,
      CLICKUP_MAX_RETRIES: env.CLICKUP_MAX_RETRIES,
      CLICKUP_BACKOFF_BASE_MS: env.CLICKUP_BACKOFF_BASE_MS,
      CLICKUP_BACKOFF_MAX_MS: env.CLICKUP_BACKOFF_MAX_MS,
    };
  },
  requestFn: request,
});
