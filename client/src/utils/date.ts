// utils/prettyDate.ts
type PrettyDateOptions = {
  withTime?: boolean;
  withSeconds?: boolean;
  style?: "short" | "medium" | "long";
};

type Style = NonNullable<PrettyDateOptions["style"]>;

function parseLooseDate(input: string | number | Date): Date | null {
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input !== "string") return null;

  // 1) try native parse (handles ISO, RFC, etc.)
  const native = new Date(input);
  if (!isNaN(native.getTime())) return native;

  // 2) handle: "12/12/2025, 17:14:39"
  const cleaned = input.replace(",", "").trim();
  const [datePart, timePart] = cleaned.split(/\s+/);

  if (!datePart) return null;

  const [a, b, y] = datePart.split("/").map(Number);
  if (![a, b, y].every((n) => Number.isFinite(n))) return null;

  let month = a;
  let day = b;

  // if clearly DD/MM (e.g. 31/01/2025), swap
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  }

  let hh = 0,
    mm = 0,
    ss = 0;

  if (timePart) {
    const t = timePart.split(":").map(Number);
    hh = t[0] ?? 0;
    mm = t[1] ?? 0;
    ss = t[2] ?? 0;
  }

  const d = new Date(y, month - 1, day, hh, mm, ss);
  return isNaN(d.getTime()) ? null : d;
}

export function prettyDate(
  input: string | number | Date,
  opts: PrettyDateOptions = {}
) {
  const d = parseLooseDate(input);
  if (!d) return "-";

  const withTime = opts.withTime ?? true;
  const withSeconds = opts.withSeconds ?? false;
  const style: Style = opts.style ?? "medium";

  const dateStyleMap: Record<Style, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "short", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
  };

  const dateStr = new Intl.DateTimeFormat(undefined, dateStyleMap[style]).format(
    d
  );

  if (!withTime) return dateStr;

  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  }).format(d);

  return `${dateStr} • ${timeStr}`;
}

/**
 * Get time ago string (e.g., "2 hours ago", "3 days ago")
 */
export function timeAgo(input: string | number | Date): string {
  const d = parseLooseDate(input);
  if (!d) return "-";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return diffSeconds <= 1 ? "just now" : `${diffSeconds} seconds ago`;
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  }
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
}