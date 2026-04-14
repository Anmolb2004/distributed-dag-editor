const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m} minute${m > 1 ? "s" : ""} ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h} hour${h > 1 ? "s" : ""} ago`;
  }
  if (diff < MONTH) {
    const d = Math.floor(diff / DAY);
    return `${d} day${d > 1 ? "s" : ""} ago`;
  }
  if (diff < YEAR) {
    const m = Math.floor(diff / MONTH);
    return `${m} month${m > 1 ? "s" : ""} ago`;
  }
  const y = Math.floor(diff / YEAR);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}

export function formatDuration(ms: number): string {
  if (ms < SECOND) return `${ms}ms`;
  return `${(ms / SECOND).toFixed(1)}s`;
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
