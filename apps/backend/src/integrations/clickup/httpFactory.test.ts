import { describe, expect, it, vi } from "vitest";
import { createClickUpHttp } from "./httpFactory";
import { ClickUpHttpError } from "./httpTypes";

const baseEnv = {
  CLICKUP_API_TOKEN: "t",
  CLICKUP_API_BASE_URL: "https://api.clickup.com/api/v2",
  CLICKUP_TIMEOUT_MS: 10_000,
  CLICKUP_MAX_RETRIES: 2,
  CLICKUP_BACKOFF_BASE_MS: 1,
  CLICKUP_BACKOFF_MAX_MS: 5,
};

function bodyOf(obj: unknown) {
  return { text: async () => JSON.stringify(obj) };
}

describe("createClickUpHttp", () => {
  it("retries on 429 then succeeds", async () => {
    const calls: number[] = [];
    const requestFn = vi.fn(async () => {
      calls.push(1);
      if (calls.length === 1) {
        return { statusCode: 429, headers: { "content-type": "application/json" }, body: bodyOf({ err: "rate" }) };
      }
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: bodyOf({ ok: true }) };
    });

    const sleep = vi.fn(async () => {});
    const http = createClickUpHttp({ getEnv: () => baseEnv, requestFn, sleep });

    const res = await http.clickupRequest<{ ok: boolean }>("GET", "/team");
    expect(res.ok).toBe(true);
    expect(requestFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 then succeeds", async () => {
    let n = 0;
    const requestFn = vi.fn(async () => {
      n++;
      if (n === 1) {
        return { statusCode: 500, headers: { "content-type": "application/json" }, body: bodyOf({ err: "oops" }) };
      }
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: bodyOf({ ok: 1 }) };
    });

    const sleep = vi.fn(async () => {});
    const http = createClickUpHttp({ getEnv: () => baseEnv, requestFn, sleep });

    const res = await http.clickupRequest<{ ok: number }>("GET", "/team");
    expect(res.ok).toBe(1);
    expect(requestFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 400 and throws ClickUpHttpError", async () => {
    const requestFn = vi.fn(async () => {
      return { statusCode: 400, headers: { "content-type": "application/json" }, body: bodyOf({ err: "bad" }) };
    });

    const sleep = vi.fn(async () => {});
    const http = createClickUpHttp({ getEnv: () => baseEnv, requestFn, sleep });

    await expect(http.clickupRequest("GET", "/team")).rejects.toBeInstanceOf(ClickUpHttpError);
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledTimes(0);
  });

  it("sends JSON body for POST", async () => {
    const requestFn = vi.fn(async (_url, opts) => {
      expect(opts.method).toBe("POST");
      expect(typeof opts.body).toBe("string");
      expect(opts.body).toContain('"hello":"world"');
      return { statusCode: 200, headers: { "content-type": "application/json" }, body: bodyOf({ ok: true }) };
    });

    const http = createClickUpHttp({ getEnv: () => baseEnv, requestFn, sleep: vi.fn(async () => {}) });

    const res = await http.clickupRequest<{ ok: boolean }>("POST", "/x", undefined, { hello: "world" });
    expect(res.ok).toBe(true);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

});
