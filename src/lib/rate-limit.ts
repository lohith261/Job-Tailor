/**
 * Per-user AI rate limiter — stored in the DB so it works across serverless instances.
 *
 * Rules:
 *  - Minimum 10 seconds between any two AI calls from the same user
 *  - Pro users: same cooldown (still protects against bug exploitation)
 *
 * Call checkAiRateLimit() BEFORE every AI API call.
 * The quota system (quota.ts) enforces monthly limits; this enforces burst protection.
 *
 * Race-condition safety: uses a single atomic updateMany with a WHERE guard on
 * aiLastCallAt so that concurrent requests cannot both pass the cooldown check.
 */

import { prisma } from "@/lib/db";

/** Minimum ms between consecutive AI calls per user */
const COOLDOWN_MS = 10_000;

export async function checkAiRateLimit(userId: string): Promise<
  { allowed: true } | { allowed: false; retryAfterMs: number; retryAfterSec: number }
> {
  const threshold = new Date(Date.now() - COOLDOWN_MS);

  // Atomic: only updates (and returns count=1) if aiLastCallAt is null OR older than threshold.
  // Concurrent requests that reach this line simultaneously will both attempt the update,
  // but only one will find the row matching the WHERE condition — the other gets count=0.
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ aiLastCallAt: null }, { aiLastCallAt: { lt: threshold } }],
    },
    data: { aiLastCallAt: new Date() },
  });

  if (result.count > 0) {
    return { allowed: true };
  }

  // The update was blocked — either the user is in cooldown or doesn't exist.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiLastCallAt: true },
  });

  if (!user) return { allowed: false, retryAfterMs: 0, retryAfterSec: 0 };

  const elapsed = user.aiLastCallAt ? Date.now() - user.aiLastCallAt.getTime() : 0;
  const retryAfterMs = Math.max(0, COOLDOWN_MS - elapsed);
  return {
    allowed: false,
    retryAfterMs,
    retryAfterSec: Math.ceil(retryAfterMs / 1000),
  };
}
