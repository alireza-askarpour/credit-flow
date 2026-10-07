export const DEFAULT_MAX_ATTEMPTS = 3;
export const RETRY_BACKOFFS_MS = [5_000, 15_000, 60_000];
export const RETRY_JITTER_RATIO = 0.2;

export function calculateRetryDelay(
  attemptNumber: number,
  random = Math.random(),
): number {
  const index = Math.min(
    Math.max(attemptNumber - 1, 0),
    RETRY_BACKOFFS_MS.length - 1,
  );
  const jitter = 1 - RETRY_JITTER_RATIO + random * RETRY_JITTER_RATIO * 2;
  const baseDelay = RETRY_BACKOFFS_MS[index] ?? 5_000;
  return Math.round(baseDelay * jitter);
}
