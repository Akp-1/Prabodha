'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch, getStoredToken, setStoredToken, ApiClientError } from '@/lib/api-client';

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'teacher' | 'student' | 'parent';
};

type LoginResponse = { token: string; user: AuthUser };

type AuthContextValue = {
    user: AuthUser | null;
    /** True while we're checking localStorage for an existing session on first load. */
    isLoading: boolean;
    login: (instituteSlug: string, email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_STORAGE_KEY = 'prabodha-auth-user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Hydrate from localStorage once on mount — we don't verify the token
    // against the server here (that happens naturally on the first real API
    // call); this just restores the UI's idea of "who's logged in" instantly
    // instead of flashing a logged-out state on every page refresh.
    useEffect(() => {
        const token = getStoredToken();
        const rawUser = typeof window !== 'undefined' ? window.localStorage.getItem(USER_STORAGE_KEY) : null;
        if (token && rawUser) {
            try {
                setUser(JSON.parse(rawUser));
            } catch {
                setStoredToken(null);
            }
        }
        setIsLoading(false);
    }, []);

    async function login(instituteSlug: string, email: string, password: string) {
        const data = await apiFetch<LoginResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ instituteSlug, email, password }),
        });
        setStoredToken(data.token);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
        setUser(data.user);
    }

    function logout() {
        setStoredToken(null);
        window.localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
    }

    return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}

export { ApiClientError };