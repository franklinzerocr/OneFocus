export function parseDueDateFromIssue(body: string | null): string | null {
  if (!body) return null;
  // formato simple: "due:2025-12-31"
  const m = body.match(/due\s*:\s*(\d{4}-\d{2}-\d{2})/i);
  return m?.[1] ?? null;
}
