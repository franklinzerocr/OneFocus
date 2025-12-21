import crypto from "node:crypto";

export function verifyGithubSignature(opts: {
  secret: string;
  body: Buffer;
  signatureHeader?: unknown;
}) {

  function headerToString(v: unknown): string | undefined {
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    return undefined;
  }
  const header = headerToString(opts.signatureHeader);

  if (!header) return false;

  // GitHub: "sha256=<hex>"
  const [algo, sig] = header.split("=");
  if (algo !== "sha256" || !sig) return false;

  const hmac = crypto.createHmac("sha256", opts.secret).update(opts.body).digest("hex");
  return timingSafeEqualHex(hmac, sig);
}

export function verifyClickUpSignature(opts: {
  secret: string;
  body: Buffer;
  signatureHeader?: unknown;
}) {
  // ClickUp signature header naming varies depending on webhook setup.
  // We implement generic HMAC SHA256: header contains hex digest.

  function headerToString(v: unknown): string | undefined {
    if (typeof v === "string") return v;
    if (Array.isArray(v) && typeof v[0] === "string") return v[0];
    return undefined;
  }
  const header = headerToString(opts.signatureHeader);
  
  if (!header) return false;

  // Allow either "sha256=<hex>" or "<hex>"
  const sig = header.includes("=") ? header.split("=")[1] : header;
  if (!sig) return false;

  const hmac = crypto.createHmac("sha256", opts.secret).update(opts.body).digest("hex");
  return timingSafeEqualHex(hmac, sig);
}

function timingSafeEqualHex(a: string, b: string) {
  // normalize length
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
