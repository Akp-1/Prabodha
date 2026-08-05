import { Clock, CalendarX } from 'lucide-react';

export interface TodaySlot {
  id: string;
  startTime: string;
  endTime: string;
  bst?: {
    subject?: { name: string } | null;
    batch?: { name: string } | null;
  } | null;
}

export function TodayPanel({ slots, isLoading }: { slots: TodaySlot[]; isLoading?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl px-8 py-[30px] max-w-[340px] w-full">
      <div className="font-display font-semibold text-[21px] mb-[18px]">Today&apos;s sessions</div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[52px] rounded-lg bg-paper animate-pulse" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2.5 py-6">
          <span className="w-10 h-10 rounded-full bg-paper flex items-center justify-center">
            <CalendarX size={18} strokeWidth={1.6} className="text-ink-soft" />
          </span>
          <div className="text-sm text-ink-soft">No sessions scheduled for today.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-3 py-2.5 px-1.5 rounded-lg">
              <span className="w-8 h-8 rounded-full bg-pine/[0.07] flex items-center justify-center flex-shrink-0">
                <Clock size={14} strokeWidth={1.8} className="text-pine" />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-medium text-ink truncate">
                  {slot.bst?.subject?.name ?? 'Session'}
                  {slot.bst?.batch?.name ? ` · ${slot.bst.batch.name}` : ''}
                </div>
                <div className="text-[12px] text-ink-soft">
                  {slot.startTime} – {slot.endTime}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
