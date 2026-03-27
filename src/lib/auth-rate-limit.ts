/**
 * IP-based rate limiter for auth endpoints (signup, login, forgot-password).
 *
 * Uses an in-process Map keyed on IP address. This is effective for:
 *   - Local / single-instance deployments
 *   - Burst attacks that hit the same serverless instance
 *
 * Limitation: each serverless cold-start gets a fresh Map, so a determined attacker
 * spreading requests across many instances can bypass it. For production at scale,
 * replace with Upstash Redis or similar distributed store.
 *
 * Limits: 10 attempts per IP per 15-minute window.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export function getClientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkAuthRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}
