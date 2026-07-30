// Plain-SVG circular progress ring — no chart library dependency needed for
// a single percentage indicator. stroke-dasharray/offset trick, rotated so
// the arc starts at 12 o'clock.
export function CircularProgress({ percent, size = 140, label }: { percent: number; size?: number; label?: string }) {
    const stroke = 12;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = circumference - (clamped / 100) * circumference;

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E4E7E1" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#2F6B5E"
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold text-ink">{Math.round(clamped)}%</span>
                {label && <span className="text-[11px] text-ink-soft">{label}</span>}
            </div>
        </div>
    );
}