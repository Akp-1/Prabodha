'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, clearToken, ApiClientError } from '@/lib/api-client';

// Re-export so existing imports from '@/components/auth/AuthProvider' keep working.
export { ApiClientError };

// ── Types ──────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
};

/** Alias kept for backward-compat with PR-2 callers. */
export type UserProfile = AuthUser;

export interface InstituteProfile {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: AuthUser | null;
  institute: InstituteProfile | null;
  token: string | null;
  /** Preferred name — matches contributor's AuthProvider API. */
  loading: boolean;
  /** Alias for `loading` — matches PR-2 callers. */
  isLoading: boolean;
  login: (credentials: { instituteSlug: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────

const LAST_SLUG_KEY = 'prabodha-last-institute-slug';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [institute, setInstitute] = useState<InstituteProfile | null>(null);
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Validate the stored JWT against the server and populate user + institute.
  const fetchMe = useCallback(async (authToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!response.ok) {
        clearToken();
        setTokenState(null);
        setUser(null);
        setInstitute(null);
        return false;
      }

      const data = await response.json();
      setUser(data.user);
      setInstitute(data.institute ?? null);
      setTokenState(authToken);
      return true;
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
      setInstitute(null);
      return false;
    }
  }, []);

  // On mount, check for an existing JWT and validate it.
  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      fetchMe(existingToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async ({
    instituteSlug,
    email,
    password,
  }: {
    instituteSlug: string;
    email: string;
    password: string;
  }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instituteSlug, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    setToken(data.token);
    setTokenState(data.token);

    // Remember the slug for convenience on the next visit.
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_SLUG_KEY, instituteSlug);
    }

    setUser(data.user);
    // Fetch full profile (includes institute details from /api/auth/me).
    await fetchMe(data.token);
    router.push('/dashboard');
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setInstitute(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    const currentToken = getToken();
    if (currentToken) {
      await fetchMe(currentToken);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        institute,
        token: tokenState,
        loading,
        isLoading: loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
