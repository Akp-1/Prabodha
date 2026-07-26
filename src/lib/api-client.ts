/**
 * Thin wrapper around fetch for calling our own /api/* routes from client
 * components. Attaches the bearer token from AuthProvider's storage and
 * throws a normal Error with the server's message on non-2xx responses, so
 * callers can just `try { await apiFetch(...) } catch (err) { ... }`.
 */

const TOKEN_STORAGE_KEY = 'prabodha-auth-token';

export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export class ApiClientError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getStoredToken();

    const res = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    // DELETE routes return 204 with no body — nothing to parse.
    if (res.status === 204) return undefined as T;

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new ApiClientError(res.status, data?.error || `Request failed (${res.status})`);
    }

    return data as T;
}