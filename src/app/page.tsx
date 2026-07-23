import Link from 'next/link';

// This is a placeholder — the full marketing site (hero, modules, roles,
// early-access form) will be ported from the standalone HTML version into
// this route as its own task. For now it just confirms the app boots and
// links into the dashboard shell for local development.
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-paper text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-saffron flex items-center justify-center font-display font-bold text-xl text-pine-deep">
        P
      </div>
      <div>
        <h1 className="font-display font-semibold text-3xl mb-2">Prabodha</h1>
        <p className="text-ink-soft max-w-md">
          Institution management platform - Next.js app running locally. Marketing site coming soon.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="font-semibold text-sm px-5 py-2.5 rounded-full bg-saffron text-pine-deep hover:opacity-90 transition-opacity"
      >
        Open dashboard
      </Link>
    </main>
  );
}
