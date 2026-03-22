/**
 * In-memory cancellation flags for pipeline runs.
 * Keyed by userId so each user has an independent flag.
 * Simple and sufficient for single-server deployments.
 */
const cancelFlags = new Map<string, boolean>();

export function requestCancellation(userId: string): void {
  cancelFlags.set(userId, true);
}

export function isCancellationRequested(userId: string): boolean {
  return cancelFlags.get(userId) === true;
}

export function clearCancellation(userId: string): void {
  cancelFlags.delete(userId);
}
