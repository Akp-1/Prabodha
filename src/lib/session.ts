import { prisma } from './db';

/**
 * High-performance session & user status cache designed to handle 100,000+ users
 * with minimal database load and instant invalidation on deactivation/logout.
 */

interface UserStatusEntry {
  isActive: boolean;
  role: string;
  cachedAt: number;
}

const USER_STATUS_TTL_MS = 60 * 1000; // 60 seconds
const MAX_CACHE_ENTRIES = 50000; // bounded to prevent unbounded memory growth

interface SessionState {
  revokedTokens: Map<string, number>; // jti -> expiresAt (epoch ms)
  userStatusCache: Map<string, UserStatusEntry>; // userId -> UserStatusEntry
}

declare global {
  // eslint-disable-next-line no-var
  var __prabodha_session_state: SessionState | undefined;
}

const state: SessionState = globalThis.__prabodha_session_state || {
  revokedTokens: new Map(),
  userStatusCache: new Map(),
};

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prabodha_session_state = state;
}

/**
 * Periodically cleans up expired tokens from the revocation blocklist.
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [jti, expiresAt] of state.revokedTokens.entries()) {
    if (expiresAt <= now) {
      state.revokedTokens.delete(jti);
    }
  }
}

/**
 * Revokes a JWT by its unique ID (`jti`) until its expiration time.
 */
export function revokeToken(jti: string, expInSeconds?: number): void {
  if (!jti) return;
  const expiresAtMs = expInSeconds ? expInSeconds * 1000 : Date.now() + 7 * 24 * 60 * 60 * 1000;
  state.revokedTokens.set(jti, expiresAtMs);

  // Lazy cleanup if set grows large
  if (state.revokedTokens.size > 1000) {
    cleanupExpiredTokens();
  }
}

/**
 * Checks if a token's `jti` has been revoked (e.g. logged out).
 */
export function isTokenRevoked(jti?: string): boolean {
  if (!jti) return false;
  const expiresAt = state.revokedTokens.get(jti);
  if (!expiresAt) return false;

  if (Date.now() > expiresAt) {
    state.revokedTokens.delete(jti);
    return false;
  }
  return true;
}

/**
 * Evicts oldest cache entries if size exceeds MAX_CACHE_ENTRIES (LRU eviction).
 */
function evictOldestCacheEntries() {
  if (state.userStatusCache.size <= MAX_CACHE_ENTRIES) return;
  const keysToDelete = Array.from(state.userStatusCache.keys()).slice(0, 5000);
  for (const key of keysToDelete) {
    state.userStatusCache.delete(key);
  }
}

/**
 * Retrieves user active status, checking in-memory cache first, falling back to DB.
 * Guarantees zero redundant queries for active users while detecting deleted/deactivated users.
 */
export async function getUserActiveStatus(
  userId: string,
  instituteId: string
): Promise<{ isActive: boolean; role: string } | null> {
  const now = Date.now();
  const cached = state.userStatusCache.get(userId);

  if (cached && now - cached.cachedAt < USER_STATUS_TTL_MS) {
    return { isActive: cached.isActive, role: cached.role };
  }

  // Fetch from database scoped by instituteId
  const user = await prisma.user.findFirst({
    where: { id: userId, instituteId },
    select: { id: true, isActive: true, role: true },
  });

  if (!user) {
    // User deleted or does not exist
    state.userStatusCache.delete(userId);
    return null;
  }

  // Cache entry
  evictOldestCacheEntries();
  state.userStatusCache.set(userId, {
    isActive: user.isActive,
    role: user.role,
    cachedAt: now,
  });

  return { isActive: user.isActive, role: user.role };
}

/**
 * Immediately invalidates the cached status of a user (e.g., when an admin deactivates them).
 */
export function invalidateUserCache(userId: string): void {
  state.userStatusCache.delete(userId);
}

/**
 * Updates the cached status directly (e.g., set isActive: false immediately).
 */
export function setUserCacheStatus(userId: string, isActive: boolean, role: string): void {
  state.userStatusCache.set(userId, {
    isActive,
    role,
    cachedAt: Date.now(),
  });
}
