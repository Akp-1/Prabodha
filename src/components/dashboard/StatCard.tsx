import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Small secondary line under the value, e.g. "3 today" */
  hint?: string;
  /** Stagger delay (ms) for the mount-in animation */
  delay?: number;
}) {
  return (
    <div
      className="group bg-white border border-line rounded-xl px-[22px] pt-[22px] pb-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(15,61,62,0.18)] animate-[statCardIn_0.4s_ease_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-[18px]">
        <span className="text-sm text-ink-soft font-medium">{label}</span>
        <span className="w-9 h-9 rounded-[10px] bg-pine/[0.07] flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-saffron/15">
          <Icon size={18} strokeWidth={1.8} className="text-pine" />
        </span>
      </div>
      <div className="font-display font-semibold text-[34px] text-ink leading-none">{value}</div>
      {hint && <div className="text-[12px] text-ink-soft font-medium mt-2">{hint}</div>}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-line rounded-xl px-[22px] pt-[22px] pb-5 animate-pulse">
      <div className="flex items-center justify-between mb-[18px]">
        <span className="h-[14px] w-20 bg-line rounded" />
        <span className="w-9 h-9 rounded-[10px] bg-line" />
      </div>
      <div className="h-[34px] w-14 bg-line rounded" />
    </div>
  );
}
