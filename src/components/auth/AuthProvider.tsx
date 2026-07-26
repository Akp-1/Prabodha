'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, clearToken } from '@/lib/api-client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
}

export interface InstituteProfile {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: UserProfile | null;
  institute: InstituteProfile | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { instituteSlug: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const LAST_SLUG_KEY = 'prabodha-last-institute-slug';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [institute, setInstitute] = useState<InstituteProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const fetchMe = useCallback(async (authToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
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
      setInstitute(data.institute);
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

    // Store institute slug for convenience
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_SLUG_KEY, instituteSlug);
    }

    setUser(data.user);
    // Fetch full profile (includes institute details)
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
        token,
        loading,
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
