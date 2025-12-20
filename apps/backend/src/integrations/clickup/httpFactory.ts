import { ClickUpHttpError } from "./httpTypes";


export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ClickUpEnv = {
  CLICKUP_API_TOKEN: string;
  CLICKUP_API_BASE_URL: string;
  CLICKUP_TIMEOUT_MS: number;
  CLICKUP_MAX_RETRIES: number;
  CLICKUP_BACKOFF_BASE_MS: number;
  CLICKUP_BACKOFF_MAX_MS: number;
};

export type RequestFn = (
  url: URL,
  opts: {
    method: HttpMethod;
    headers: Record<string, string>;
    headersTimeout: number;
    bodyTimeout: number;
    body?: string;
  },
) => Promise<{
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: { text(): Promise<string> };
}>;


export function createClickUpHttp(deps: {
  getEnv: () => ClickUpEnv;
  requestFn: RequestFn;
  sleep?: (ms: number) => Promise<void>;
}) {
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  function calcBackoff(attempt: number) {
    const env = deps.getEnv();
    const base = env.CLICKUP_BACKOFF_BASE_MS;
    const max = env.CLICKUP_BACKOFF_MAX_MS;
    const expo = base * 2 ** attempt;
    const jitter = Math.floor(Math.random() * base);
    return Math.min(max, expo + jitter);
  }

  async function clickupRequest<T>(
    method: HttpMethod,
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
    bodyJson?: unknown,
  ) {
    const env = deps.getEnv();

    const baseUrl = env.CLICKUP_API_BASE_URL.replace(/\/$/, "");
    const url = new URL(baseUrl + path);

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        url.searchParams.set(k, String(v));
      }
    }

    const maxRetries = env.CLICKUP_MAX_RETRIES;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {

        const body = bodyJson === undefined ? undefined : JSON.stringify(bodyJson);

        const res = await deps.requestFn(url, {
          method,
          headers: {
            Authorization: env.CLICKUP_API_TOKEN,
            "Content-Type": "application/json",
          },
          headersTimeout: env.CLICKUP_TIMEOUT_MS,
          bodyTimeout: env.CLICKUP_TIMEOUT_MS,
          ...(body ? { body } : {}),
        });

        const text = await res.body.text();
        const contentType = res.headers["content-type"];
        const parsed =
          typeof contentType === "string" && contentType.includes("application/json") && text
            ? JSON.parse(text)
            : text;

        if (res.statusCode >= 200 && res.statusCode < 300) {
          return parsed as T;
        }

        if (res.statusCode === 429 || (res.statusCode >= 500 && res.statusCode <= 599)) {
          const wait = calcBackoff(attempt);
          await sleep(wait);
          continue;
        }

        throw new ClickUpHttpError(`ClickUp HTTP ${res.statusCode} for ${method} ${path}`, res.statusCode, parsed);
      } catch (e) {
        lastErr = e;

        // If we intentionally threw a non-retryable HTTP error (e.g. 400),
        // don't retry.
        if (e instanceof ClickUpHttpError) {
          const status = e.status;
          const retryable = status === 429 || (status >= 500 && status <= 599);
          if (!retryable) break;
        }

        if (attempt === maxRetries) break;

        const wait = calcBackoff(attempt);
        await sleep(wait);
      }

    }

    if (lastErr instanceof Error) throw lastErr;
    throw new Error("ClickUp request failed");
  }

  async function clickupGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>) {
    return clickupRequest<T>("GET", path, query);
  }

  async function clickupPatch<T>(path: string, bodyJson: unknown) {
    return clickupRequest<T>("PATCH", path, undefined, bodyJson);
  }

  async function clickupPost<T>(path: string, bodyJson: unknown) {
    return clickupRequest<T>("POST", path, undefined, bodyJson);
  }

  return { clickupRequest, clickupGet, clickupPatch, clickupPost };


  return { clickupRequest };
}
