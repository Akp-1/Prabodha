/**
 * Client-side API helper.
 *
 * Wraps `fetch()` so every request automatically includes the
 * Authorization: Bearer <token> header. The JWT is read from
 * localStorage (set by the login page once it exists).
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api-client';
 *   const teachers = await apiFetch('/api/teachers');
 */

const TOKEN_KEY = 'prabodha-auth-token';

// ── Token helpers ──────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** Alias kept for backward-compat with PR-2 callers. */
export const getStoredToken = getToken;

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Overloaded setter that also handles `null` (clear).
 * Kept for backward-compat with PR-2 callers.
 */
export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

// ── Typed error class ──────────────────────────────────────────────

export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── Main fetch wrapper ─────────────────────────────────────────────

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 204 No Content — nothing to parse.
  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({ error: response.statusText }));

  if (!response.ok) {
    throw new ApiClientError(response.status, data?.error || `Request failed (${response.status})`);
  }

  return data as T;
}
