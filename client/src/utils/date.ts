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
