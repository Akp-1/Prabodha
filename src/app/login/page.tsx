'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ApiClientError } from '@/components/auth/AuthProvider';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const [instituteSlug, setInstituteSlug] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            await login(instituteSlug.trim(), email.trim(), password);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-paper px-6">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-saffron flex items-center justify-center font-display font-bold text-xl text-pine-deep">
                        P
                    </div>
                    <h1 className="font-display font-semibold text-2xl text-ink">Sign in to Prabodha</h1>
                    <p className="text-ink-soft text-sm">Enter your institute and account details</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white rounded-2xl border border-line p-6">
                    <Field label="Institute slug" value={instituteSlug} onChange={setInstituteSlug} placeholder="my-institute" autoFocus />
                    <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
                    <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-2 font-semibold text-sm px-5 py-2.5 rounded-full bg-saffron text-pine-deep hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </div>
        </main>
    );
}

function Field({
                   label,
                   value,
                   onChange,
                   type = 'text',
                   placeholder,
                   autoFocus,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                required
                className="rounded-lg border border-line px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-saffron/50 focus:border-saffron"
            />
        </label>
    );
}