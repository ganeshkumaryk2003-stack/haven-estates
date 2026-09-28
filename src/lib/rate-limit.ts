import "server-only";
import { headers } from "next/headers";

// In-memory sliding window limiter. Good for a single Node process (dev, small deployments).
// For multi-instance deployments swap the store for Redis (e.g. @upstash/ratelimit) - the
// `rateLimit` signature stays the same.

interface Bucket {
  hits: number[];
}

const globalForLimiter = globalThis as unknown as { rateLimitStore?: Map<string, Bucket> };
const store = globalForLimiter.rateLimitStore ?? new Map<string, Bucket>();
globalForLimiter.rateLimitStore = store;

export interface RateLimitRule {
  /** Max requests allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  signup: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  enquiry: { limit: 10, windowMs: 60 * 60_000 },
  message: { limit: 60, windowMs: 60_000 },
  offer: { limit: 10, windowMs: 60 * 60_000 },
  upload: { limit: 40, windowMs: 10 * 60_000 },
  report: { limit: 5, windowMs: 60 * 60_000 },
  generic: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests. Please slow down and try again shortly.");
    this.name = "RateLimitError";
  }
}

export function checkRateLimit(key: string, rule: RateLimitRule) {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((ts) => now - ts < rule.windowMs);
  if (bucket.hits.length >= rule.limit) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfter = Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000));
    store.set(key, bucket);
    return { ok: false as const, retryAfterSeconds: retryAfter };
  }
  bucket.hits.push(now);
  store.set(key, bucket);
  // Opportunistic cleanup so the map does not grow forever.
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (v.hits.every((ts) => now - ts > rule.windowMs)) store.delete(k);
    }
  }
  return { ok: true as const, remaining: rule.limit - bucket.hits.length };
}

export async function getClientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

// Throws RateLimitError when the rule is exceeded. Keys combine the action, the caller's IP
// and (when available) their user id.
export async function enforceRateLimit(action: keyof typeof RATE_LIMITS, identifier?: string | null) {
  const ip = await getClientIp();
  const result = checkRateLimit(`${action}:${identifier ?? ip}:${ip}`, RATE_LIMITS[action]);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}

export function resetRateLimitStore() {
  store.clear();
}
