import type { DashboardRange } from "../service/dashboardService";

/** Short label for chart x-axis ticks. */
export function formatTrendBucketLabel(bucket: string, range: DashboardRange): string {
  if (range === "daily") {
    const d = new Date(`${bucket}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    return bucket;
  }

  if (range === "weekly") {
    const match = bucket.match(/^(\d{4})-W(\d+)$/);
    if (match) return `W${match[2]}`;
    return bucket;
  }

  if (range === "monthly") {
    const [year, month] = bucket.split("-");
    if (year && month) {
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    }
    return bucket;
  }

  return bucket;
}

/** Full label for tooltips. */
export function formatTrendBucketTooltip(bucket: string, range: DashboardRange): string {
  if (range === "daily") {
    const d = new Date(`${bucket}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  if (range === "weekly") {
    const match = bucket.match(/^(\d{4})-W(\d+)$/);
    if (match) return `Week ${match[2]}, ${match[1]}`;
  }

  if (range === "monthly") {
    const [year, month] = bucket.split("-");
    if (year && month) {
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    }
  }

  return bucket;
}
