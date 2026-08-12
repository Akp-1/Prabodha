'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  UserCheck, 
  Calendar, 
  Clock3, 
  ClipboardCheck, 
  BookMarked, 
  Award, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Copy, 
  Check, 
  ChevronRight, 
  FileText,
  Lock
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@prabodha.local', label: 'Full Institution Control', color: 'bg-pine text-white' },
  { role: 'Teacher', email: 'teacher@prabodha.local', label: 'Classes & Grading', color: 'bg-saffron text-pine-deep font-semibold' },
  { role: 'Student', email: 'rohan.mehta@prabodha.local', label: 'Schedule & Homework', color: 'bg-pine-deep text-white' },
  { role: 'Parent', email: 'parent@prabodha.local', label: 'Child Performance Ring', color: 'bg-amber-600 text-white' },
];

const ROLES_SHOWCASE = [
  {
    id: 'admin',
    title: 'Institution Administrators',
    icon: Building2,
    badge: 'Master Control',
    description: 'Centralized management of batches, subjects, faculty assignments, and multi-tenant settings.',
    features: [
      'Multi-tenant institution data isolation',
      'Batch & section allocation with subject mapping',
      'Faculty assignment management (Batch-Subject-Teacher)',
      'Institution-wide operational analytics & directory'
    ],
    previewStats: [
      { label: 'Active Learners', val: '30+' },
      { label: 'Faculty Members', val: '3' },
      { label: 'Batches', val: '3' },
      { label: 'Daily Sessions', val: '20' }
    ]
  },
  {
    id: 'teacher',
    title: 'Faculty & Educators',
    icon: GraduationCap,
    badge: 'Daily Operations',
    description: 'Conflict-free scheduling, 1-tap attendance marking, study resource publication, and assessment grading.',
    features: [
      'Conflict-free weekly timetable grid',
      '1-Tap classroom attendance marking with roster check',
      'Study materials sharing (PDFs, Notes, External links)',
      'Homework assignment and per-student score entry'
    ],
    previewStats: [
      { label: 'Conflict Check', val: '100% Auto' },
      { label: 'Attendance Input', val: '< 30s' },
      { label: 'Material Types', val: '4 Formats' },
      { label: 'Grading Engine', val: 'Instant' }
    ]
  },
  {
    id: 'student',
    title: 'Learners & Students',
    icon: Users,
    badge: 'Learning Space',
    description: 'Dedicated workspace for viewing daily class schedules, accessing study resources, and tracking homework due dates.',
    features: [
      'Personalized daily & weekly class timetable',
      'Organized subject-wise study material drive',
      'Homework checklist with overdue highlight warnings',
      'Graded exam results breakdown with percentage calculation'
    ],
    previewStats: [
      { label: 'Class Schedule', val: 'Live' },
      { label: 'Study Drive', val: '24/7 Access' },
      { label: 'Homework Status', val: 'Self-Check' },
      { label: 'Assessment Logs', val: 'Complete' }
    ]
  },
  {
    id: 'parent',
    title: 'Parents & Guardians',
    icon: UserCheck,
    badge: 'Child Progress Portal',
    description: 'Real-time visibility into linked children’s attendance rate, pending assignments, and exam performance.',
    features: [
      'Animated SVG Attendance Ring showing total sessions attended',
      'Homework completion progress bar with pending count',
      'Recent exam marks table with color-coded score percentages',
      'Multi-child linking support for parents with multiple learners'
    ],
    previewStats: [
      { label: 'Attendance Ring', val: 'Real-Time' },
      { label: 'Homework Tracker', val: 'Visual Bar' },
      { label: 'Score Color-Code', val: '≥75% Green' },
      { label: 'Child Accounts', val: 'Multi-Link' }
    ]
  }
];

export default function HomePage() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState('admin');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const selectedRole = ROLES_SHOWCASE.find((r) => r.id === activeRole) || ROLES_SHOWCASE[0];

  function copyCredential(email: string) {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  }

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-saffron selection:text-pine-deep">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-saffron font-display text-xl font-bold text-pine-deep shadow-sm transition-transform group-hover:scale-105">
              P
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-ink">Prabodha</span>
              <span className="ml-2 rounded bg-pine/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-pine uppercase tracking-wider">
                V1 Ready
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-ink-soft">
            <a href="#features" className="hover:text-pine transition-colors">Features</a>
            <a href="#roles" className="hover:text-pine transition-colors">Roles</a>
            <a href="#demo" className="hover:text-pine transition-colors">Live Demo</a>
            <a href="#architecture" className="hover:text-pine transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pine-deep transition-all"
              >
                <span>Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-pine px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pine-deep transition-all"
                >
                  <span>Register Institute</span>
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,rgba(233,169,74,0.15),transparent)]" />
        
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-saffron-deep/30 bg-saffron/20 px-3.5 py-1.5 text-xs font-semibold text-saffron-deep mb-6">
                <Sparkles size={14} className="text-saffron-deep" />
                <span>Multi-Tenant Academic Platform</span>
              </div>

              <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl leading-[1.12]">
                Modern Institution Management <br className="hidden sm:block" />
                <span className="text-pine">Built for Excellence.</span>
              </h1>

              <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-2xl">
                Prabodha unifies schedules, attendance, study materials, homework, and parent visibility into one secure, high-performance platform with multi-tenant data isolation.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={user ? '/dashboard' : '/login'}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-pine px-7 py-3.5 text-base font-semibold text-white shadow-md hover:bg-pine-deep hover:shadow-lg transition-all"
                >
                  <span>{user ? 'Go to Dashboard' : 'Explore Live Institute'}</span>
                  <ArrowRight size={18} />
                </Link>

                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-6 py-3.5 text-base font-semibold text-ink hover:bg-paper transition-all"
                >
                  <Copy size={17} className="text-pine" />
                  <span>View Test Logins</span>
                </a>
              </div>

              {/* Badges */}
              <div className="mt-10 flex flex-wrap items-center gap-6 pt-6 border-t border-line/60 text-xs font-semibold text-ink-soft">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-pine" />
                  <span>Multi-Tenant Isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 size={18} className="text-pine" />
                  <span>Conflict-Free Timetables</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-pine" />
                  <span>Real-Time Parent Portal</span>
                </div>
              </div>
            </div>

            {/* Right Hero Graphic Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-line bg-white p-6 shadow-xl">
                {/* Header Mock */}
                <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-pine flex items-center justify-center text-white font-bold text-sm">
                      D
                    </div>
                    <div>
                      <div className="font-display font-semibold text-sm text-ink">Demo Institution</div>
                      <div className="text-xs text-ink-soft">Academic Year 2026</div>
                    </div>
                  </div>
                  <span className="rounded-md bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">Active</span>
                </div>

                {/* Dashboard Cards Grid Mock */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl border border-line bg-paper p-3.5">
                    <div className="text-xs text-ink-soft font-medium mb-1">Total Learners</div>
                    <div className="font-display font-bold text-2xl text-ink">30</div>
                    <div className="text-[11px] text-pine font-medium mt-1">10 per batch</div>
                  </div>

                  <div className="rounded-xl border border-line bg-paper p-3.5">
                    <div className="text-xs text-ink-soft font-medium mb-1">Attendance</div>
                    <div className="font-display font-bold text-2xl text-pine">92%</div>
                    <div className="text-[11px] text-ink-soft font-medium mt-1">Today&apos;s Sessions</div>
                  </div>
                </div>

                {/* Live Timetable Preview Widget */}
                <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold mb-3">
                    <span className="text-ink">Today&apos;s Schedule</span>
                    <span className="text-pine font-mono">09:00 AM - 01:00 PM</span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-paper p-2.5 border border-line/60">
                      <div>
                        <div className="font-semibold text-ink">Mathematics · Class 10A</div>
                        <div className="text-ink-soft text-[11px]">Room 101 · Dr. Sharma</div>
                      </div>
                      <span className="rounded bg-pine/10 px-2 py-0.5 font-semibold text-pine">09:00 - 10:00</span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-paper p-2.5 border border-line/60">
                      <div>
                        <div className="font-semibold text-ink">Physics · Class 10A</div>
                        <div className="text-ink-soft text-[11px]">Lab 2 · Prof. Verma</div>
                      </div>
                      <span className="rounded bg-pine/10 px-2 py-0.5 font-semibold text-pine">10:15 - 11:15</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Role-Based Interactive Showcase */}
      <section id="roles" className="py-16 bg-white border-y border-line">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-xs font-semibold text-saffron-deep uppercase tracking-widest">Tailored Experience</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2">
              Designed for Every Academic Stakeholder
            </h2>
            <p className="mt-3 text-ink-soft text-base">
              Role-based dashboards engineered specifically for institution administrators, faculty members, learners, and parents.
            </p>
          </div>

          {/* Role Tabs Nav */}
          <div className="flex justify-center mb-10 overflow-x-auto pb-2">
            <div className="inline-flex rounded-xl border border-line bg-paper p-1.5">
              {ROLES_SHOWCASE.map((r) => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRole(r.id)}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-pine text-white shadow-sm'
                        : 'text-ink-soft hover:text-ink hover:bg-white/60'
                    }`}
                  >
                    <Icon size={17} />
                    <span>{r.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Role Content Card */}
          <div className="rounded-2xl border border-line bg-paper p-8 lg:p-10 shadow-sm max-w-5xl mx-auto">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <span className="rounded-md bg-saffron/20 border border-saffron-deep/30 px-3 py-1 text-xs font-semibold text-saffron-deep uppercase tracking-wider">
                  {selectedRole.badge}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink mt-4">
                  {selectedRole.title}
                </h3>
                <p className="mt-3 text-ink-soft leading-relaxed text-base">
                  {selectedRole.description}
                </p>

                <div className="mt-6 space-y-3">
                  {selectedRole.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-ink">
                      <CheckCircle2 size={18} className="text-pine flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Showcase Box */}
              <div className="lg:col-span-5">
                <div className="rounded-xl border border-line bg-white p-6 shadow-xs">
                  <div className="font-display font-semibold text-sm text-ink mb-4 pb-3 border-b border-line">
                    {selectedRole.title} Highlights
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRole.previewStats.map((st, i) => (
                      <div key={i} className="rounded-lg bg-paper p-3 border border-line/60">
                        <div className="text-[11px] text-ink-soft font-medium">{st.label}</div>
                        <div className="font-display font-bold text-xl text-pine mt-0.5">{st.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid (Bento Grid) */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs font-semibold text-saffron-deep uppercase tracking-widest">Complete Academic ERP</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-2">
              Six Modules Engine Built into One Platform
            </h2>
            <p className="mt-3 text-ink-soft text-base">
              From timetable collision logic to automated parent attendance rings, Prabodha covers every daily operational requirement.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Card 1 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <Clock3 size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Conflict-Free Timetables</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Automatic overlap validation rejects double-booking faculty, batches, or classrooms on the same day and time.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <ClipboardCheck size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">1-Tap Attendance</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Fast input roster workflow for teachers. Pre-fills existing session submissions for simple same-day editing.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <FileText size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Study Material Drive</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Organize PDF guides, lecture notes, image diagrams, and web links grouped neatly by academic subject.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <BookMarked size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Homework Engine</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Assign tasks with due dates. Students toggle completion status while teachers and parents monitor progress.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <Award size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Exams & Marks Grading</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Record assessment scores per student with max marks validation, average calculations, and score percentages.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl border border-line bg-white p-7 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pine/10 text-pine mb-5">
                <Lock size={24} />
              </div>
              <h3 className="font-display text-xl font-bold text-ink">Multi-Tenant Cloud</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Strict `instituteId` database scoping across all endpoints powered by PostgreSQL and Prisma ORM.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Demo Credentials Banner */}
      <section id="demo" className="py-16 bg-pine text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-xs font-semibold text-saffron uppercase tracking-widest">Instant Evaluation</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
              Test Live Role-Based Credentials
            </h2>
            <p className="mt-3 text-white/80 text-base">
              Click any role email below to copy login details. All demo accounts use password <code className="bg-pine-deep px-2 py-0.5 rounded text-saffron font-mono font-bold">password123</code>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DEMO_CREDENTIALS.map((cred) => {
              const isCopied = copiedEmail === cred.email;
              return (
                <div key={cred.role} className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-xs flex flex-col justify-between">
                  <div>
                    <span className={`inline-block rounded px-2.5 py-1 text-xs ${cred.color}`}>
                      {cred.role}
                    </span>
                    <div className="mt-3 font-mono text-sm font-medium text-white truncate">
                      {cred.email}
                    </div>
                    <div className="text-xs text-white/70 mt-1">
                      {cred.label}
                    </div>
                  </div>

                  <button
                    onClick={() => copyCredential(cred.email)}
                    className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    {isCopied ? <Check size={14} className="text-saffron" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Copied Email' : 'Copy Email'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-saffron px-8 py-3.5 font-display font-semibold text-pine-deep hover:bg-saffron/90 transition-colors shadow-md"
            >
              <span>Sign In to Demo Institution</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Architecture Footer */}
      <footer id="architecture" className="border-t border-line bg-paper py-12 text-ink-soft">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron font-display font-bold text-pine-deep text-sm">
              P
            </div>
            <span className="font-display font-bold text-ink text-lg">Prabodha</span>
            <span className="text-xs text-ink-soft">© 2026 Prabodha ERP Platform.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <span className="rounded bg-white border border-line px-2.5 py-1">Next.js 14</span>
            <span className="rounded bg-white border border-line px-2.5 py-1">PostgreSQL</span>
            <span className="rounded bg-white border border-line px-2.5 py-1">Prisma ORM</span>
            <span className="rounded bg-white border border-line px-2.5 py-1">Tailwind CSS</span>
            <span className="rounded bg-white border border-line px-2.5 py-1">TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
