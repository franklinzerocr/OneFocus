import { request } from "undici";
import { getConfig } from "../../config";
import { createClickUpHttp } from "./httpFactory";

export const { clickupRequest } = createClickUpHttp({
  getEnv: () => {
    const { env } = getConfig();
    return {
      CLICKUP_API_TOKEN: env.CLICKUP_API_TOKEN,
      CLICKUP_API_BASE_URL: env.CLICKUP_API_BASE_URL,
      CLICKUP_TIMEOUT_MS: env.CLICKUP_TIMEOUT_MS,
      CLICKUP_MAX_RETRIES: env.CLICKUP_MAX_RETRIES,
      CLICKUP_BACKOFF_BASE_MS: env.CLICKUP_BACKOFF_BASE_MS,
      CLICKUP_BACKOFF_MAX_MS: env.CLICKUP_BACKOFF_MAX_MS,
    };
  },
  requestFn: request,
});
