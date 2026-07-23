import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <div className="bg-white border border-line rounded-xl px-[22px] pt-[22px] pb-5">
      <div className="flex items-center justify-between mb-[22px]">
        <span className="text-sm text-ink-soft font-medium">{label}</span>
        <Icon size={20} strokeWidth={1.6} className="text-pine" />
      </div>
      <div className="font-display font-semibold text-[34px] text-ink">{value}</div>
    </div>
  );
}
