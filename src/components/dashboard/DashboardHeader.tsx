function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formattedToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function DashboardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-[30px] max-w-[820px]">
      <div>
        <div className="font-mono text-[11.5px] tracking-[0.12em] text-saffron-deep uppercase mb-2">
          {timeOfDayGreeting()} · {formattedToday()}
        </div>
        <h1 className="font-display font-semibold text-[32px] tracking-tight">{title}</h1>
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </div>
  );
}
