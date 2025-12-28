// apps/backend/src/cron/snapshotCron.ts
import { getConfig } from "../config";
import { snapshotWorkspaceFromSpaces } from "../normalizer/clickup/crawler";
import { snapshotList } from "../normalizer/clickup/snapshotList";

function parseHHMM(s: string): { h: number; m: number } {
  const parts = s.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid SNAPSHOT_CRON_TIME: "${s}" (expected HH:MM)`);
  }

  const hh = Number(parts[0]);
  const mm = Number(parts[1]);

  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    throw new Error(`Invalid SNAPSHOT_CRON_TIME: "${s}" (expected HH:MM)`);
  }

  return { h: hh, m: mm };
}

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
  return false;
}

function tzOffsetMinutes(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);

  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  // Examples: "GMT+1", "GMT+01:00", "GMT-02:00"
  const m = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;

  const sign = m[1] === "-" ? -1 : 1;
  const hh = Number(m[2] ?? "0");
  const mm = Number(m[3] ?? "0");
  return sign * (hh * 60 + mm);
}

function ymdInTz(now: Date, tz: string): { y: number; mo: number; d: number; curH: number; curM: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    y: Number(get("year")),
    mo: Number(get("month")),
    d: Number(get("day")),
    curH: Number(get("hour")),
    curM: Number(get("minute")),
  };
}

// Convert desired local time (tz) on a given y/m/d to an actual UTC Date.
// Uses offset extraction + 1-2 iterations to stabilize around DST transitions.
function localTimeInTzToUtcDate(y: number, mo: number, d: number, h: number, m: number, tz: string): Date {
  // First guess: interpret as UTC, then subtract tz offset.
  let guessUtcMs = Date.UTC(y, mo - 1, d, h, m, 0, 0);

  for (let i = 0; i < 3; i++) {
    const offsetMin = tzOffsetMinutes(new Date(guessUtcMs), tz);
    const candidateUtcMs = Date.UTC(y, mo - 1, d, h, m, 0, 0) - offsetMin * 60_000;
    if (Math.abs(candidateUtcMs - guessUtcMs) < 1000) {
      guessUtcMs = candidateUtcMs;
      break;
    }
    guessUtcMs = candidateUtcMs;
  }

  return new Date(guessUtcMs);
}

function nextRunDate(now: Date, timeHHMM: string, tz: string): Date {
  const { h, m } = parseHHMM(timeHHMM);
  const { y, mo, d, curH, curM } = ymdInTz(now, tz);

  const addDay = curH > h || (curH === h && curM >= m);

  if (!addDay) {
    return localTimeInTzToUtcDate(y, mo, d, h, m, tz);
  }
  // naive day+1 is ok; Date.UTC handles month/year rollover
  const tomorrowUtc = new Date(Date.UTC(y, mo - 1, d + 1, 12, 0, 0, 0)); // noon avoids edge issues
  const { y: y2, mo: mo2, d: d2 } = ymdInTz(tomorrowUtc, tz);
  return localTimeInTzToUtcDate(y2, mo2, d2, h, m, tz);
}

export function startSnapshotCron() {
  const { env } = getConfig();

  const enabled = parseBool(env.SNAPSHOT_CRON_ENABLED);
  if (!enabled) return;

  const tz = (env.SNAPSHOT_CRON_TZ as string | undefined) ?? "Europe/Paris";
  const time = (env.SNAPSHOT_CRON_TIME as string | undefined) ?? "19:00";

  let timer: NodeJS.Timeout | null = null;
  let isRunning = false;

  const scheduleNext = () => {
    const now = new Date();
    const runAt = nextRunDate(now, time, tz);
    const delay = Math.max(1000, runAt.getTime() - now.getTime());

    timer = setTimeout(async () => {
      if (isRunning) {
        // overlap guard
        scheduleNext();
        return;
      }

      isRunning = true;
      try {
        await snapshotWorkspaceFromSpaces(async (listId) => {
          await snapshotList(listId);
        });
      } catch (e) {
        console.error("Workspace snapshot failed:", e);
      } finally {
        isRunning = false;
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();

  return () => {
    if (timer) clearTimeout(timer);
  };
}
