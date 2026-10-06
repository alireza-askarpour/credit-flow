import {
  calculateRetryDelay,
  RETRY_BACKOFFS_MS,
} from './retry.constants';

describe('retry policy', () => {
  it('uses the documented backoff schedule without jitter at midpoint', () => {
    expect(calculateRetryDelay(1, 0.5)).toBe(RETRY_BACKOFFS_MS[0]);
    expect(calculateRetryDelay(2, 0.5)).toBe(RETRY_BACKOFFS_MS[1]);
    expect(calculateRetryDelay(3, 0.5)).toBe(RETRY_BACKOFFS_MS[2]);
  });

  it('clamps attempts beyond the configured schedule', () => {
    expect(calculateRetryDelay(99, 0.5)).toBe(RETRY_BACKOFFS_MS[2]);
  });
});
