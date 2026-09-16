import { NextRequest } from 'next/server';
import { ApiError } from './rbac';

/**
 * Lightweight in-memory sliding-window rate limiter with zero dependencies.
 * Protects critical endpoints from brute-force attacks and abuse.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface RateLimiterState {
  records: Map<string, RateLimitRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __prabodha_rate_limiter: RateLimiterState | undefined;
}

const state: RateLimiterState = globalThis.__prabodha_rate_limiter || {
  records: new Map(),
};

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prabodha_rate_limiter = state;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of state.records.entries()) {
    if (record.resetAt <= now) {
      state.records.delete(key);
    }
  }
}

/**
 * Retrieves the client's IP address from standard proxy headers or fallback.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Enforces rate limiting on a specific key (e.g. IP + endpoint).
 * Throws ApiError(429) if limit exceeded within the time window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const record = state.records.get(key);

  if (record && now < record.resetAt) {
    if (record.count >= limit) {
      const retrySecs = Math.ceil((record.resetAt - now) / 1000);
      throw new ApiError(
        429,
        `Too many requests. Please wait ${retrySecs} second${retrySecs === 1 ? '' : 's'} before trying again.`
      );
    }
    record.count++;
  } else {
    // New window
    if (state.records.size > 5000) {
      cleanupExpired();
    }
    state.records.set(key, { count: 1, resetAt: now + windowMs });
  }
}

/**
 * Resets the rate limit for a specific key (useful after successful login).
 */
export function resetRateLimit(key: string): void {
  state.records.delete(key);
}
