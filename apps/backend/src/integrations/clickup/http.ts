import { request } from "undici";
import { getConfig } from "../../config";

const { env } = getConfig()

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class ClickUpHttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcBackoff(attempt: number) {
  const base = env.CLICKUP_BACKOFF_BASE_MS;
  const max = env.CLICKUP_BACKOFF_MAX_MS;
  const expo = base * 2 ** attempt;
  const jitter = Math.floor(Math.random() * base);
  return Math.min(max, expo + jitter);
}

export async function clickupRequest<T>(method: HttpMethod, path: string, query?: Record<string, string | number | boolean | undefined>) {
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
      const res = await request(url, {
        method,
        headers: {
          Authorization: env.CLICKUP_API_TOKEN,
          "Content-Type": "application/json",
        },
        // body: undefined,
        headersTimeout: env.CLICKUP_TIMEOUT_MS,
        bodyTimeout: env.CLICKUP_TIMEOUT_MS,
      });

      const text = await res.body.text();
      const contentType = res.headers["content-type"];
      const parsed = contentType?.includes("application/json") && text ? JSON.parse(text) : text;

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return parsed as T;
      }

      // Retry on rate limits and transient errors
      if (res.statusCode === 429 || (res.statusCode >= 500 && res.statusCode <= 599)) {
        const wait = calcBackoff(attempt);
        await sleep(wait);
        continue;
      }

      throw new ClickUpHttpError(`ClickUp HTTP ${res.statusCode} for ${method} ${path}`, res.statusCode, parsed);
    } catch (e) {
      lastErr = e;
      if (attempt === maxRetries) break;

      const wait = calcBackoff(attempt);
      await sleep(wait);
    }
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new Error("ClickUp request failed");
}
