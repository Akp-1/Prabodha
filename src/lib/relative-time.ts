/** Formats a date/ISO-string as a short relative label: "2h ago", "Yesterday", "3 days ago". */
export function relativeTime(input: Date | string): string {
    const date = typeof input === 'string' ? new Date(input) : input;
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDay = Math.round(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
