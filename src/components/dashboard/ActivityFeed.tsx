import type { LucideIcon } from 'lucide-react';
import { relativeTime } from '@/lib/relative-time';

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  at: Date | string;
}

export function ActivityFeed({ items, isLoading }: { items: ActivityItem[]; isLoading?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl px-8 py-[30px] flex-1">
      <div className="font-display font-semibold text-[21px] mb-[18px]">Recent activity</div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[52px] rounded-lg bg-paper animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-ink-soft py-2">Nothing to show yet — activity will appear here as it happens.</div>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 px-1.5 rounded-lg">
              <span className="w-8 h-8 rounded-full bg-pine/[0.07] flex items-center justify-center flex-shrink-0">
                <item.icon size={14} strokeWidth={1.8} className="text-pine" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink truncate">{item.title}</div>
                <div className="text-[12px] text-ink-soft truncate">{item.subtitle}</div>
              </div>
              <div className="text-[11.5px] text-ink-soft flex-shrink-0 whitespace-nowrap">{relativeTime(item.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
