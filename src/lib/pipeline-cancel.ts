import { redis } from "@/lib/redis";

const TTL_SECONDS = 3600; // 1 hour — auto-expires if never cleared

function key(userId: string): string {
  return `pipeline:cancel:${userId}`;
}

export async function requestCancellation(userId: string): Promise<void> {
  await redis.set(key(userId), "1", { ex: TTL_SECONDS });
}

export async function isCancellationRequested(userId: string): Promise<boolean> {
  return (await redis.get(key(userId))) === "1";
}

export async function clearCancellation(userId: string): Promise<void> {
  await redis.del(key(userId));
}
